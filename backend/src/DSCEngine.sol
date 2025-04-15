// This is the engine that will control the decentralized stablecoin (DSC)

// Layout of Contract:
// version
// imports
// interfaces, libraries, contracts
// errors
// Type declarations
// State variables
// Events
// Modifiers
// Functions

// Layout of Functions:
// constructor
// receive function (if exists)
// fallback function (if exists)
// external
// public
// internal
// private
// view and pure functions

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

// imports: Oracles (AggregatorV3Interface), OracleLib, ReentrancyGuard, IERC20, DecentralizedStableCoin

// AggregatorV3Interface is an interface for Chainlink price feeds
import { AggregatorV3Interface } from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
// ReentrancyGuard 
import { ReentrancyGuard } from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
// IERC20: 
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// DecentralizedStableCoin
import { DecentralizedStableCoin } from "./DecentralizedStableCoin.sol";

/**
 * @title DSCEngine
 * @author Loc Giang
 * 
 * The system is designed to be as minimal as possible, and have the tokens maintain a 1 token == $1 peg at all time
 * This is a stablecoin with the properties:
 * - Exogenously Collateralized
 * - Dollar pegged
 * - Algorithmically stable
 * 
 * It is similar to DAI if DAI has no governance, no fees, and was backed by only WETH and WBTC
 * 
 * Our DSC system should always be 'overcollateralized'. At no point, should the value of 
 * all collateral < the $ backed value of all the DSC
 * 
 * @notice This contract is the core of the Decentralized Stablecoin system. It handles all the logic
 * for minting and redeeming DSC, as well as depositing and withdrawing collateral.
 * @notice This contract is based on the MakerDAO DSS system
 */
contract DSCEngine is ReentrancyGuard {
    ////////////
    // Errors //
    ////////////
    error DSCEngine__TokenAddressesAndPriceFeedAddressesAmountDontMatch();
    error DSCEngine__AmountMustBeMoreThanZero();
    error DSCEngine__TokenNotAllowed();
    error DSCEngine__TransferFailed();
    error DSCEngine__BreaksHealthFactor(uint256 healthFactor);
    error DSCEngine__MintFailed();
    error DSCEngine__HealthFactorOk();
    error DSCEngine__HealthFactorNotImproved();

    ///////////
    // Types //
    ///////////

    /////////////////////
    // State Variables //
    /////////////////////
    DecentralizedStableCoin private immutable i_dsc; // The DSC token!!!

    uint256 private constant LIQUIDATION_THRESHOLD = 50;
    uint256 private constant LIQUIDATION_PRECISION = 100;
    uint256 private constant ADDITIONAL_FEED_PRECISION = 1e10;
    uint256 private constant PRECISION = 1e18;
    uint256 private constant MIN_HEALTH_FACTOR = 1e18; // 1.0 in 18 decimal precision, below 1.0 means the position is undercollateralized
    uint256 private constant LIQUIDATION_BONUS = 10; // this means you get assets at a 10% discount when liquidating


    // @dev Mapping of the token address to the price feed address
    mapping(address collateralToken => address priceFeed) private s_priceFeeds;

    // @dev Mapping of the user address to the token address to the amount of collateral deposited
    mapping(address user => mapping(address collateralToken => uint256 amount)) private s_collateralDeposited;

    // @dev Mapping of the user address to the amount of DSC minted
    mapping(address user => uint256 amount) private s_DSCMinted;

    // @dev This is the list of all accepted collateral tokens
    address[] private s_collateralTokens;

    ////////////
    // Events //
    ////////////
    event CollateralDeposited(address indexed user, address indexed token, uint256 amount);
    event CollateralRedeemed(address indexed redeemFrom, address indexed redeemTo, address token, uint256 amount);

    ///////////////
    // Modifiers //
    ///////////////

    // @dev This modifier checks that the amount is greater than zero
    modifier moreThanZero(uint256 amount){
        if (amount == 0) {
            revert DSCEngine__AmountMustBeMoreThanZero();
        }
        _;
    }

    // @dev This modifier checks that the token is allowed
    modifier isAllowedToken(address token) {
        if (s_priceFeeds[token]== address(0)){
            revert DSCEngine__TokenNotAllowed();
        }
        _;
    }

    ///////////////
    // Functions //
    ///////////////

    constructor(address[] memory tokenAddresses, address[] memory priceFeedAddresses, address dscAddress) {
        if (tokenAddresses.length != priceFeedAddresses.length) {
            revert DSCEngine__TokenAddressesAndPriceFeedAddressesAmountDontMatch();
        }

        // these feeds will be the USD pair
        // for example ETH/ USD or MKR / USD
        for (uint256 i = 0; i < tokenAddresses.length; i++) {
            s_priceFeeds[tokenAddresses[i]] = priceFeedAddresses[i];
            s_collateralTokens.push(tokenAddresses[i]);
        }
        i_dsc = DecentralizedStableCoin(dscAddress);
    }

    ////////////////////////
    // External Functions //
    ////////////////////////

    /**
     * @param tokenCollateralAddress: The ERC20 token address of the collateral you're depositing
     * @param amountCollateral: The amount of collateral you're dpositing
     * @param amountDscToMint: The amount of DSC you want to mint
     * @notice This function will deposit your collateral and mint DSC in one transaction
     * Why: To save gas and improve user experience.
     */
    function depositCollateralAndMintDsc(
        address tokenCollateralAddress, 
        uint256 amountCollateral, 
        uint256 amountDscToMint
    ) 
        external 
    {
        depositCollateral(tokenCollateralAddress, amountCollateral);
        mintDsc(amountDscToMint);
    }

    /**
     * @param tokenCollateralAddress: the address of the collateral user is getting back
     * @param amountCollateral: the amount of collateral to withdraw
     * @param amountDscToBurn: the amount of dsc to burn
     * Why? burn Dsc and redeem collateral in one function, reducing gas
     */
    function redeemCollateralForDsc(
        address tokenCollateralAddress,
        uint256 amountCollateral,
        uint256 amountDscToBurn
    ) 
        external
        moreThanZero(amountCollateral)
        isAllowedToken(tokenCollateralAddress)
    {
        _burnDsc(amountDscToBurn, msg.sender, msg.sender);
        _redeemCollateral(tokenCollateralAddress, amountCollateral, msg.sender, msg.sender);
        _revertIfHealthFactorIsBroken(msg.sender);
    }

    /**
     * @param tokenCollateralAddress: token address of the collateral
     * @param userBeingLiquidate: address of user being liquidate
     * @param amountDebtToCover: the amount of debt needed to cover by liquidator
     */
    function liquidate(
        address tokenCollateralAddress, 
        address userBeingLiquidate, 
        uint256 amountDebtToCover
    ) 
        external 
        isAllowedToken(tokenCollateralAddress)
        moreThanZero(amountDebtToCover)
        nonReentrant
    {
        // check user broke health factor
        uint256 startingUserHealthFactor = _healthFactor(userBeingLiquidate);
        if (startingUserHealthFactor >= MIN_HEALTH_FACTOR) {
            revert DSCEngine__HealthFactorOk();
        }
    
        uint256 tokenAmountFromDebtCovered = getTokenAmountFromUsd(tokenCollateralAddress, amountDebtToCover);
        uint256 bonusCollateral = (tokenAmountFromDebtCovered * LIQUIDATION_BONUS) / LIQUIDATION_PRECISION;
        // liquidator gets the collateral token
        _redeemCollateral(tokenCollateralAddress, tokenAmountFromDebtCovered + bonusCollateral, userBeingLiquidate, msg.sender);
        // liquidator pays the debt for the user being liquidated
        _burnDsc(amountDebtToCover, userBeingLiquidate, msg.sender);

        // check if the liquidated hf improved
        uint256 endingUserHealthFactor = _healthFactor(userBeingLiquidate);
        if (endingUserHealthFactor <= startingUserHealthFactor) {
            revert DSCEngine__HealthFactorNotImproved();
        }
        _revertIfHealthFactorIsBroken(msg.sender);
    }

    /**
     * @param tokenCollateralAddress: the address of the token to be redeemed
     * @param amountCollateral: the amount of token to be redeemed
     * why? this is the external function that will call the private _redeemCollateral function
     */
    function redeemCollateral(
        address tokenCollateralAddress, 
        uint256 amountCollateral
    ) 
        external
        isAllowedToken(tokenCollateralAddress)
        moreThanZero(amountCollateral)
        nonReentrant
    {
        _redeemCollateral(tokenCollateralAddress, amountCollateral, msg.sender, msg.sender);
        _revertIfHealthFactorIsBroken(msg.sender);
    }

    /**
     * @param amount: the amount of dsc to burn
     * why? this is the external function to call the private _burnDsc function
     */
    function burnDsc(uint256 amount) external moreThanZero(amount) {
        _burnDsc(amount, msg.sender, msg.sender);
        _revertIfHealthFactorIsBroken(msg.sender); // i dont think this is ever going to hit.
    }

    //////////////////////
    // Public Functions //
    //////////////////////

    /**
     * @param tokenCollateralAddress: the ERC20 token address of the collateral you're depositing
     * @param amountCollateral: The amount of collateral you're depositing
     */
    function depositCollateral(
        address tokenCollateralAddress, 
        uint256 amountCollateral
    ) 
        public 
        moreThanZero(amountCollateral) 
        nonReentrant 
        isAllowedToken(tokenCollateralAddress) 
    {
        // this array keeps track of the address of the user and the collateral token address
        // increased by the amount of collateral sent to this function
        s_collateralDeposited[msg.sender][tokenCollateralAddress] += amountCollateral;
        
        // emit collateral deposited event
        // event logs the deposit for off-chain tracking (e.g, frontends, analytics)
        emit CollateralDeposited(msg.sender, tokenCollateralAddress, amountCollateral);
        
        // calls transferFrom on the ERC20 token contract
        // transfers amountCollateral from msg.sender to the DSCEngine contract
        bool success = IERC20(tokenCollateralAddress).transferFrom(msg.sender, address(this), amountCollateral);
        
        // reverts if transfer fails
        if (!success) {
            revert DSCEngine__TransferFailed();
        }
    }

    /**
     * @param amountDscToMint: The amount of DSC you want to mint
     * You can only mint DSC if you have enough collateral
     */
    function mintDsc(uint256 amountDscToMint) public moreThanZero(amountDscToMint) nonReentrant {
        // an array to keep track of the user DSC balance
        s_DSCMinted[msg.sender] += amountDscToMint;

        // check if health factor is broken
        _revertIfHealthFactorIsBroken(msg.sender);

        // call the mint function in dsc
        bool minted = i_dsc.mint(msg.sender, amountDscToMint);

        // if mint fails, revert
        if (minted != true) {
            revert DSCEngine__MintFailed();
        }
    }

    ///////////////////////
    // Private Functions //
    ///////////////////////

    /**
     * @param amountDscToBurn: The amount of DSC to burn
     * @param onBehalfOf: those whose debt is being reduce
     * @param dscFrom: account providing the DSC token (often same as onBehalfOf), also the liquidator providing dsc to liquidate someone
     * Why? This function handles the burning of the DSC token belonging to a user
     */
    function _burnDsc(uint256 amountDscToBurn, address onBehalfOf, address dscFrom) private {
        s_DSCMinted[onBehalfOf] -= amountDscToBurn;
        bool success = i_dsc.transferFrom(dscFrom, address(this), amountDscToBurn);
        if (!success) {
            revert DSCEngine__TransferFailed();
        }
        i_dsc.burn(amountDscToBurn);
    }

    /**
     * @param tokenCollateralAddress: The collateral token address that is being redeemed
     * @param amountCollateral: The ammount that is being withdraw
     * @param from: Account whose collateral is being reduced
     * @param to: Recipient of the withdrawn token
     * why? take the collateral token and transfer to user.
     */
    function _redeemCollateral(
        address tokenCollateralAddress,
        uint256 amountCollateral,
        address from,
        address to
    ) 
        private
    {
        s_collateralDeposited[from][tokenCollateralAddress] -= amountCollateral;
        emit CollateralRedeemed(from, to, tokenCollateralAddress, amountCollateral);
        bool success = IERC20(tokenCollateralAddress).transfer(to, amountCollateral);
        if (!success) {
            revert DSCEngine__TransferFailed();
        }
    }

    //////////////////////////////////////////////
    // Private & Internal View & Pure Functions //
    //////////////////////////////////////////////

    /**
     * @param user: The address of the user whose health we're checking
     * this is the private safety check that verifies whether a user's position remains properly collateralized after an operation
     * like minting DSC or withdrawing collateral
     */
    function _revertIfHealthFactorIsBroken(address user) private view {
        // get the user's current health factor
        uint256 userHealthFactor = _healthFactor(user);

        // compares it against the system's minimum requirement
        // MIN_HEALTH_FACTOR = 1e18
        if(userHealthFactor < MIN_HEALTH_FACTOR) {
            // reverts with a descriptive error if unsafe
            revert DSCEngine__BreaksHealthFactor(userHealthFactor);
        }
    }

    /**
     * @param user: The address of the user whose health we're getting
     */
    function _healthFactor(address user) private view returns(uint256) {
        // grab the total DSC and collateral value in USD from the account of the given user
        (uint256 totalDscMinted, uint256 collateralValueInUsd) = _getAccountInformation(user);
        // send the two values to the calculator
        return _calculateHealthFactor(totalDscMinted, collateralValueInUsd);
    }
    
    /**
     * @param user: The address of the user whose account information we're getting
     * return the dsc of the user and how much collateral they have in USD
     */
    function _getAccountInformation(address user) private view returns(uint256 totalDscMinted, uint256 collateralValueInUsd) {
        totalDscMinted = s_DSCMinted[user];
        collateralValueInUsd = _getAccountCollateralValue(user);
        return (totalDscMinted, collateralValueInUsd);
    }

    /**
     * @param user: The address of the user whose total collateral value we're evaluating
     * This private view of the function that returns the total collateral of a user
     */
    function _getAccountCollateralValue(address user) private view returns(uint256 totalCollateralValue) {
        // loops through all the collateral tokens allowed in this contract
        for (uint256 index = 0; index < s_collateralTokens.length; index ++) {
            // grab the address of the token from the array
            address token = s_collateralTokens[index];
            // grab the amount from the 2d array
            uint256 amount = s_collateralDeposited[user][token];
            // add the USD value into total
            totalCollateralValue += _getUsdValue(token, amount);
        }
        return totalCollateralValue;
    }

    /**
     * @param token: the address of the ERC20 collateral token
     * @param amount: the quantity of the token
     */
    function _getUsdValue(address token, uint256 amount) private view returns(uint256) {
        // grab chainlink pricefeed
        AggregatorV3Interface priceFeed = AggregatorV3Interface(s_priceFeeds[token]);
        // get price data from pricefeed
        (, int256 price,,,) = priceFeed.latestRoundData();
        // return the USD value
        return ((uint256(price) * ADDITIONAL_FEED_PRECISION) * amount) / PRECISION;
    }

    /**
     * @param totalDscMinted: Total amount of DSC minted by the user
     * @param collateralValueInUsd: Total USD value of user's collateral
     * This function calculates the health factor of a user
     * Safe: HF >= 1.0
     * At Risk: HF < 1.0
     * No Debt: HF = Infinity
     */
    function _calculateHealthFactor(
        uint256 totalDscMinted, 
        uint256 collateralValueInUsd
    )
        internal
        pure
        returns(uint256) 
    {
        if (totalDscMinted == 0) {
            return type(uint256).max;
        }
        // this is basically half of the collateralValueInUsd
        uint256 collateralAdjustedForThreshold = (collateralValueInUsd * LIQUIDATION_THRESHOLD) / LIQUIDATION_PRECISION;
        // (50% of collateral) / dscMint 
        return (collateralAdjustedForThreshold * PRECISION) / totalDscMinted; 
    }

    /////////////////////////////////////////////
    // External & Public View & Pure functions //
    /////////////////////////////////////////////

    function getTokenAmountFromUsd(address token, uint256 usdAmount) public view returns(uint256) {
        uint256 usdAmountInWei = usdAmount * PRECISION; // PRECISION = 1e18
        AggregatorV3Interface priceFeed = AggregatorV3Interface(s_priceFeeds[token]);
        // price of weth (2000e8 local) or wbtc (1000e8 local)
        (, int256 price,,,) = priceFeed.latestRoundData();
        // (usdAmount * 1e18) / (price * 1e10)
        return (usdAmountInWei) / (uint256(price) * ADDITIONAL_FEED_PRECISION);
    }

    function getUsdValue(address token, uint256 amount) external view returns(uint256) {
        return _getUsdValue(token, amount);
    }

    function getAccountInformation(address user) public view returns(uint256 totalDscMinted, uint256 collateralValueInUsd) {
        return _getAccountInformation(user);
    }

    function getAdditionalFeedPrecision() public pure returns(uint256) {
        return ADDITIONAL_FEED_PRECISION;
    }

    function getPrecision() public pure returns(uint256) {
        return PRECISION;
    }

    function calculateHealthFactor(uint256 totalDscMinted, uint256 collateralValueInUsd) public pure returns(uint256) {
        return _calculateHealthFactor(totalDscMinted, collateralValueInUsd);
    }

    function getHealthFactor(address user) public view returns(uint256) {
        return _healthFactor(user);
    }

    function getCollateralBalanceOfUser(address user, address token) public view returns(uint256) {
        return s_collateralDeposited[user][token];
    }

    function getLiquidationBonus() public view returns(uint256) {
        return LIQUIDATION_BONUS;
    }
    
    function getLiquidationPrecision() public view returns(uint256) {
        return LIQUIDATION_PRECISION;
    }

    function getCollateralTokenPriceFeed(address feed) public view returns(address) {
        return s_priceFeeds[feed];
    }

    function getCollateralTokens() public view returns(address[] memory) {
        return s_collateralTokens;
    }

    function getMinHealthFactor() public pure returns(uint256) {
        return MIN_HEALTH_FACTOR;
    }

    function getLiquidationThreshold() public pure returns(uint256) {
        return LIQUIDATION_THRESHOLD;
    }

    /**
     * @param user: The address of the user whose total collateral value we're evaluating
     * This public view of the function that returns the total collateral of a user
     */
    // function getAccountCollateralValue(address user) public view returns(uint256) {
    //     return _getAccountCollateralValue(user);
    // }

    // function getUsdValue() {}

    // function getDsc() {}
}