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

    ///////////
    // Types //
    ///////////

    /////////////////////
    // State Variables //
    /////////////////////
    DecentralizedStableCoin private immutable i_dsc; // The DSC token!!!

    uint256 private constant LIQUIDATION_THRESHOLD = 50;
    uint256 private constant LIQUIDATION_PRECISION = 100;
    uint256 private constant ADDTIONAL_FEED_PRECISION = 1e10;
    uint256 private constant PRECISION = 1e18;
    uint256 private constant MIN_HEALTH_FACTOR = 1e18; // 1.0 in 18 decimal precision, below 1.0 means the position is undercollateralized


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
            revert DSCEngine__TokenAddressesAndPriceFeedAddressesAmountDontMatch();
        }
        _;
    }

    ///////////////
    // Functions //
    ///////////////

    constructor(address[] memory tokenAddresses, address[] memory priceFeedAddresses, address dscAddress) {
        if (tokenAddresses.length != priceFeedAddresses.length) {
            revert DSCEngine__TokenNotAllowed();
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

    // function redeemCollateralForDsc() {}

    // function redeemCollateral() {}

    // function burnDsc() {}

    // function liquidate() {}

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
    function mintDsc(uint256 amountDscToMint) public {
        // an array to keep track of the user DSC balance
        s_DSCMinted[msg.sender] += amountDscToMint;

        // check if health factor is broken
        revertIfHealthFactorIsBroken(msg.sender);

        // call the mint function in dsc
        // if mint fails, revert
    }

    ///////////////////////
    // Private Functions //
    ///////////////////////

    // function _redeemCollateral() {}

    // function _burnDsc() {}

    //////////////////////////////////////////////
    // Private & Internal View & Pure Functions //
    //////////////////////////////////////////////

    /**
     * @param user: The address of the user whose health we're checking
     * this is the internal safety check that verifies whether a user's position remains properly collateralized after an operation
     * like minting DSC or withdrawing collateral
     */
    function revertIfHealthFactorIsBroken(address user) internal view {
        // get the user's current health factor
        uint256 userHealthFactor = _healthFactor(user);

        // compares it against the system's minimum requirement
        if(userHealthFactor < MIN_HEALTH_FACTOR) {
            // reverts with a descriptive error if unsafe
            revert DSCEngine__BreaksHealthFactor(userHealthFactor);
        }
    }

    /**
     * @param user: The address of the user whose health we're calculating
     */
    function _healthFactor(address user) private view returns(uint256) {
        // grab the total DSC and collateral value in USD
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
        collateralValueInUsd = getAccountCollateralValue(user);
        return (totalDscMinted, collateralValueInUsd);
    }

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
        uint256 collateralAdjustedForThreshold = (collateralValueInUsd * LIQUIDATION_THRESHOLD) / LIQUIDATION_PRECISION;
        return (collateralAdjustedForThreshold * PRECISION) / totalDscMinted; 
    }

    function _getUsdValue(address token, uint256 amount) private view returns(uint256) {
        AggregatorV3Interface priceFeed = AggregatorV3Interface(s_priceFeeds[token]);
        (, int256 price,,,) = priceFeed.latestRoundData();
        return ((uint256(price) * ADDTIONAL_FEED_PRECISION) * amount) / PRECISION;
    }

    /////////////////////////////////////////////
    // External & Public View & Pure functions //
    /////////////////////////////////////////////

    function getAccountCollateralValue(address user) public view returns(uint256 totalCollateralValue) {
        for (uint256 index = 0; index < s_collateralTokens.length; index++) {
            address token = s_collateralTokens[index];
            uint256 amount = s_collateralDeposited[user][token];
            totalCollateralValue += _getUsdValue(token, amount);
        }
        return totalCollateralValue;
    }

    // function calculateHealthFactor() {}

    // function getAccountInformation() {}

    // function getUsdValue() {}

    // function getCollateralBalanceOfUser() {}

    // function getTokenAmountFromUsd() {}

    // function getPrecision() {}

    // function getAdditionalFeedPrecision() {}

    // function getLiquidationThreshold() {}

    // function getLiquidationBonus() {}

    // function getLiquidationPrecision() {}

    // function getMinHealthFactor() {}

    // function getCollateralTokens() {}

    // function getDsc() {}

    // function getCollateralTokenPriceFeed() {}

    // function getHealthFactor() {}
}