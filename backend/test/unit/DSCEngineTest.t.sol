// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import { Test, console } from "forge-std/Test.sol";
import { DeployDSC } from "../../script/DeployDSC.s.sol";
import { DecentralizedStableCoin } from "../../src/DecentralizedStableCoin.sol";
import { DSCEngine } from "../../src/DSCEngine.sol";
import { HelperConfig } from "../../script/HelperConfig.s.sol";

import { ERC20Mock } from "../mocks/ERC20Mock.sol";
import { MockFailedTransferFrom } from "../mocks/MockFailedTransferFrom.sol";
import { MockV3Aggregator } from "../mocks/MockV3Aggregator.sol";
import { MockFailedMintDSC } from "../mocks/MockFailedMintDSC.sol";
import { MockFailedTransfer } from "../mocks/MockFailedTransfer.sol";


contract DSCEngineTest is Test {
    event CollateralRedeemed(address indexed redeemFrom, address indexed redeemTo, address token, uint256 amount); // if
        // redeemFrom != redeemedTo, then it was liquidated
    DecentralizedStableCoin dsc;
    DSCEngine dsce;
    HelperConfig helperConfig;
    DeployDSC deployer;

    address ethUsdPriceFeed;
    address btcUsdPriceFeed;
    address wbtc;
    address weth;
    uint256 deployerKey;

    address user = address(1);

    uint256 public constant STARTING_USER_BALANCE = 100 ether;
    uint256 amountCollateral = 10 ether;
    uint256 amountToMint = 100 ether;
    

    /**
     * Deploying the contract
     * Getting network/mocked configs
     * Setting balances
     * Optionally setting up mocks if you're not on a local chain
     */
    function setUp() external {
        // Deploy DeployDSC script (which deploys the DecentralizedStableCoin and DSCEngine contracts)
        deployer = new DeployDSC();
        (dsc, dsce, helperConfig) = deployer.run();

        // Gets the network specific config
        (ethUsdPriceFeed, btcUsdPriceFeed, weth, wbtc, deployerKey) = helperConfig.activeNetworkConfig();

        // Set up the balances
        if (block.chainid == 31_337) {
            // If on anvil (local chain) give the user some ETH
            vm.deal(user, STARTING_USER_BALANCE);
        }

        // give user some weth and wbtc regardless of chain
        ERC20Mock(weth).mint(user, STARTING_USER_BALANCE);
        ERC20Mock(wbtc).mint(user, STARTING_USER_BALANCE);
    }

    ///////////////////////
    // Constructor Tests //
    ///////////////////////
    address[] public tokenAddresses;
    address[] public feedAddresses;

    /**
     * This unit test checks whether the DSCEngine constructor reverts if the number of token addresses doesn't match the number of price feed addresses
     */
    function testRevertsIfTokenLengthDoesntMatchPriceFeed() public {
        // notice we did not push wbtc into tokenAddresses
        tokenAddresses.push(weth);
        feedAddresses.push(ethUsdPriceFeed);
        feedAddresses.push(btcUsdPriceFeed);

        // this tells foundry "I expect the next operation to revert with this exact custom error"
        vm.expectRevert(DSCEngine.DSCEngine__TokenAddressesAndPriceFeedAddressesAmountDontMatch.selector);

        // triggering the revert
        new DSCEngine(tokenAddresses, feedAddresses, address(dsc));
    }

    /////////////////
    // Price Tests //
    /////////////////

    /**
     * Why? This test verify DSCEngine correctly converts a given amount of USD into the equivalent token amount
     */
    function testGetTokenAmountFromUsd() public view {
        // if we want $100 of weth @ $2000/weth, that would be 0.05 weth
        uint256 expectedWeth = 0.05 ether;

        // this 100 is actually dollars amount
        uint256 actualWeth = dsce.getTokenAmountFromUsd(weth, 100 ether);

        // 0.05 weth = 0.05 weth
        assertEq(expectedWeth, actualWeth);
    }

    /**
     * Why? this function is the reverse of the previous one, testing input eth amount output USD amount
     */
    function testGetUsdValue() public {
        uint256 expectedUsd = 30_000 ether;
        uint256 inputEth = 15 ether;

        uint256 outputUsd = dsce.getUsdValue(weth, inputEth);
        assertEq(expectedUsd, outputUsd);
    }

    /////////////////////////////
    // depositCollateral Tests //
    /////////////////////////////

    /**
     * Why? This test checks that DSCEngine.depositCollateral() reverts with the correct custom error when token's TransferFrom fails.
     */
    function testRevertsIfTransferFromFails() public {
        // act as owner and deploy a mock ERC20 token that fails on transferFrom()
        address owner = msg.sender;
        vm.prank(owner);
        MockFailedTransferFrom mockCollateralToken = new MockFailedTransferFrom();

        // set up array for the token and it's corresponding chainlink pricefeed
        tokenAddresses = [address(mockCollateralToken)];
        feedAddresses = [ethUsdPriceFeed];

        // deploy a new instance of DSCEngine with the mock token
        vm.prank(owner);
        DSCEngine mockDsce = new DSCEngine(tokenAddresses, feedAddresses, address(dsc));

        // mint some mock collateral token to a user address
        uint256 amountToDeposit = 10 ether;
        mockCollateralToken.mint(user, amountToDeposit);
        
        // Verify initial state
        assertEq(mockCollateralToken.balanceOf(user), amountToDeposit);
        assertEq(mockCollateralToken.balanceOf(address(mockDsce)), 0);
        
        // start simulating all actions as user
        vm.startPrank(user);
        ERC20Mock(address(mockCollateralToken)).approve(address(mockDsce), amountToDeposit);

        // set expectation that revert will happen, specifically with the custom error DSCEngine__TransferFailed
        vm.expectRevert(DSCEngine.DSCEngine__TransferFailed.selector);
        mockDsce.depositCollateral(address(mockCollateralToken), amountToDeposit);

        // Verify state after failed transfer
        assertEq(mockCollateralToken.balanceOf(user), amountToDeposit, "User balance should remain unchanged");
        assertEq(mockCollateralToken.balanceOf(address(mockDsce)), 0, "DSCEngine balance should remain unchanged");

        vm.stopPrank();
    }

    /**
     * Why? This test checks that DSCEngine.depositCollateral() reverts with the correct custom error when the collateral amount is zero.
     * DSCEngine__AmountMustBeMoreThanZero is in the modifier of the function
     */
    function testRevertsIfCollateralZero() public {
        vm.startPrank(user);
        vm.expectRevert(DSCEngine.DSCEngine__AmountMustBeMoreThanZero.selector);
        dsce.depositCollateral(weth, 0);
        vm.stopPrank();
    }

    /**
     * Why? This test checks that DSCEngine.depositCollateral() reverts with the correct custom error when the collateral token is not allowed.
     * DSCEngine__TokenNotAllowed is in the modifier of the function
     */
    function testRevertsWithUnapprovedCollateral() public {
        ERC20Mock randomToken = new ERC20Mock("Random Token", "RT", msg.sender, 100 ether);
        vm.startPrank(user);
        vm.expectRevert(DSCEngine.DSCEngine__TokenNotAllowed.selector);
        dsce.depositCollateral(address(randomToken), 100 ether);
        vm.stopPrank();
    }

    /**
     * Why? This modifier deposits collateral to the user
     */
    modifier depositedCollateral() {
        vm.startPrank(user);
        ERC20Mock(weth).approve(address(dsce), amountCollateral);
        dsce.depositCollateral(weth, amountCollateral);
        vm.stopPrank();
        _;
    }

    /**
     * Why? this test checks if user can deposit without minting any DSC
     */
    function testCanDepositCollateralWithoutMinting() public depositedCollateral {
        // user should not have any DSC minted
        uint256 userBalance = dsc.balanceOf(user);
        assertEq(userBalance, 0);
    }

    /**
     * why? this test checks if user can get account information
     * grab the collateral value in usd and then compare it to the deposited amount
     */
    function testCanDepositedCollateralAndGetAccountInfo() public depositedCollateral {
        // totalDscMinted should be 0, we have not minted any dsc yet
        // collateralValueInUsd = 10 ether (deposited) * 2000 (price of weth) = 20000e18 (e18 because price is in wei)
        (uint256 totalDscMinted, uint256 collateralValueInUsd) = dsce.getAccountInformation(user);

        // call getTokenAmountFromUsd to get amount of ether, input is 20000e18
        uint256 expectedDepositedAmount = dsce.getTokenAmountFromUsd(weth, collateralValueInUsd);

        assertEq(totalDscMinted, 0);
        // 10e18 and 10e18
        assertEq(expectedDepositedAmount, amountCollateral);
    }


    // ///////////////////////////////////////
    // // depositCollateralAndMintDsc Tests //
    // ///////////////////////////////////////
    
    /**
     * why? this test is trying to mint dsc equal to full value of collateral
     * this breaks the health factor because the contract only allows to mint 50% of the collateral value
     */
    function testRevertsIfMintedDscBreaksHealthFactor() public {
        // get the latest price of eth (2000e8). 
        //MockV3Aggregator is a mock contract that returns a fixed price
        (,int256 price,,,) = MockV3Aggregator(ethUsdPriceFeed).latestRoundData();

        // calculate how much dsc we can mint if we deposit 10 ether
        // 10e18 (amountCollateral)
        // 2000e8 (price from chainlink) * 1e10 (addtionalFeedPrecision) / 1e18 (getPrecision)= 2,000
        // 10e18 * 2000 = 20,000e18 (20k usd)
        uint256 amountToMint = (amountCollateral * (uint256(price) * dsce.getAdditionalFeedPrecision())) / dsce.getPrecision();
        
        // simulates actions as if they are being performed by the user
        vm.startPrank(user);
        // type cast weth to ERC20Mock, allows to use approve, transfer, and transferFrom ect.
        // the user approves the DSCEngine to spend their weth
        ERC20Mock(weth).approve(address(dsce), amountCollateral);

        // calculate collateral value in usd
        // 10e18 (amountCollateral) * 2000 (price) = 20,000e18 (20k usd)
        uint256 collateralValueInUsd = dsce.getUsdValue(weth, amountCollateral);

        // calculate the health factor of the user
        // input: 20,000e18 dsc, 20000e18 collateral
        // should = 0.5e18
        uint256 expectedHealthFactor = dsce.calculateHealthFactor(amountToMint, collateralValueInUsd);

        // expect the function to revert with the expected health factor
        vm.expectRevert(abi.encodeWithSelector(DSCEngine.DSCEngine__BreaksHealthFactor.selector, expectedHealthFactor));
        dsce.depositCollateralAndMintDsc(weth, amountCollateral, amountToMint);
        vm.stopPrank();
    }

    /**
     * Why? This modifier deposits collateral and mints dsc
     */
    modifier depositedCollateralAndMintedDsc() {
        // simulate actions as if they are being performed by user
        // user approves the DSCEngine to spend their weth
        vm.startPrank(user);
        ERC20Mock(weth).approve(address(dsce), amountCollateral);

        // user calls depositCollateralAndMintDsc
        // deposit 10 eth (10 ether) and mint 100 dsc (100 ether? it just works like that)
        dsce.depositCollateralAndMintDsc(weth, amountCollateral, amountToMint);
        vm.stopPrank();
        _;
    }

    /**
     * Why? this test checks if the modifier works
     */
    function testCanMintWithDepositedCollateral() public depositedCollateralAndMintedDsc {
        // user should have 100 dsc minted from modifier
        uint256 userBalance = dsc.balanceOf(user);
        assertEq(userBalance, amountToMint);
    }

    // ///////////////////
    // // mintDsc Tests //
    // ///////////////////

    /**
     * Why? this test checks if the function reverts if the mint fails
     */
    function testRevertsIfMintFails() public {
        // MockFailedMintDSC is DecentralizedStableCoin but returns false
        MockFailedMintDSC mockDsc = new MockFailedMintDSC();

        // these are for the constructor of DSCEngine
        tokenAddresses = [weth];
        feedAddresses = [ethUsdPriceFeed];

        // store the address of the entity that is executing the test
        // it is used to set up the test environment and ensure that the necessary permissions and interactions are correctly configured
        address owner = msg.sender;
        vm.prank(owner);
        DSCEngine mockDsce = new DSCEngine(tokenAddresses, feedAddresses, address(mockDsc));
        mockDsc.transferOwnership(address(mockDsce));
        
        // simulate actions as if they are being performed by the user
        // user approves the DSCEngine to spend their weth
        vm.startPrank(user);
        ERC20Mock(weth).approve(address(mockDsce), amountCollateral);

        vm.expectRevert(DSCEngine.DSCEngine__MintFailed.selector);
        mockDsce.depositCollateralAndMintDsc(weth, amountCollateral, amountToMint);
        vm.stopPrank();
    }

    /**
     * Why? This test checks if the function reverts if the mint amount is zero
     */
    function testRevertsIfMintAmountIsZero() public {
        // user deposits 10 ether and mints 100 dsc
        vm.startPrank(user);
        ERC20Mock(weth).approve(address(dsce), amountCollateral);
        dsce.depositCollateralAndMintDsc(weth, amountCollateral, amountToMint);

        // user is going to try and mint 0 dsc after
        vm.expectRevert(DSCEngine.DSCEngine__AmountMustBeMoreThanZero.selector);
        dsce.mintDsc(0);
        vm.stopPrank();
    }

    /**
     * Why? This test check if the function reverts if the mint amount breaks the health factor
     */
    function testRevertsIfMintAmountBreaksHealthFactor() public depositedCollateral {
        // grab price
        (, int256 price ,,,) = MockV3Aggregator(ethUsdPriceFeed).latestRoundData();

        // find amount to mint
        // 10e18 * 2000e8 * 1e10 / 1e18 = 20,000e18
        uint256 amountToMint = (amountCollateral * (uint256(price)  * dsce.getAdditionalFeedPrecision())) / dsce.getPrecision();

        // find expected health factor
        uint256 expectedHealthFactor = dsce.calculateHealthFactor(amountToMint, dsce.getUsdValue(weth,amountCollateral));
        
        // expect revert
        vm.expectRevert(abi.encodeWithSelector(DSCEngine.DSCEngine__BreaksHealthFactor.selector, expectedHealthFactor));
        vm.startPrank(user);
        dsce.mintDsc(amountToMint);
        vm.stopPrank();
    }

    /**
     * Why? This test checks if the function can mint dsc
     */
    function testCanMintDsc() public depositedCollateral {
        // user already deposited collateral from modifier
        vm.startPrank(user);
        dsce.mintDsc(amountToMint);

        uint256 userBalance = dsc.balanceOf(user);
        assertEq(userBalance, amountToMint);
    }

    // ///////////////////
    // // burnDsc Tests //
    // ///////////////////

    /**
     * Why? This test checks if the function reverts if user tries to burn 0 dsc
     */
    function testRevertsIfBurnAmountIsZero() public {
        vm.startPrank(user);
        vm.expectRevert(DSCEngine.DSCEngine__AmountMustBeMoreThanZero.selector);
        dsce.burnDsc(0);
        vm.stopPrank();
    }

    /**
     * Why? This test checks if user burns more than they have
     */
    function testCantBurnMoreThanUserHas() public depositedCollateralAndMintedDsc {
        vm.startPrank(user);
        vm.expectRevert();
        dsce.burnDsc(amountToMint + 1);
        vm.stopPrank();
    }

    /**
     * Why? This test checks if the user can burn their dsc
     */
    function testCanBurnDsc() public depositedCollateralAndMintedDsc {
        // actions by user
        vm.startPrank(user);
        // approve the DSCEngine to spend the user's DSC tokens, then burn the dsc 
        // amountToMint is 100 dsc (from modifier)
        ERC20Mock(address(dsc)).approve(address(dsce), amountToMint);
        dsce.burnDsc(amountToMint);

        // assert that the user's DSC balance is 0
        uint256 userBalance = dsc.balanceOf(user);
        assertEq(userBalance, 0);
    }

    // ////////////////////////////
    // // redeemCollateral Tests //
    // ////////////////////////////

    /**
     * This test is checking that the redeemCollateral function properly handles transfer failures
     */
    function testRevertsIfTransferFails() public {
        // set up mock erc20 dsc token that will fail on transfer
        address owner = msg.sender;
        vm.prank(owner);
        MockFailedTransfer mockDsc = new MockFailedTransfer();

        // set up array for DSCEngine constructor
        // deploy a new dscengine with the mock token
        tokenAddresses = [address(mockDsc)];
        feedAddresses = [ethUsdPriceFeed];
        vm.prank(owner);
        DSCEngine mockDsce = new DSCEngine(tokenAddresses, feedAddresses, address(mockDsc));
        
        // mint some mock tokens to the user
        // transfer ownership of the mock token to the dscengine
        mockDsc.mint(user, amountCollateral);
        vm.prank(owner);
        mockDsc.transferOwnership(address(mockDsce));

        // switches to the user context
        // approve the dscengine to spend the user's mock token
        vm.startPrank(user);
        ERC20Mock(address(mockDsc)).approve(address(mockDsce), amountCollateral);

        // 3. test execution (act/assert)
        // deposits collateral
        mockDsce.depositCollateral(address(mockDsc), amountCollateral); 
        // expects a revert with dsceengine__transferfailed
        vm.expectRevert(DSCEngine.DSCEngine__TransferFailed.selector);
        // attempts to redeem collateral
        mockDsce.redeemCollateral(address(mockDsc), amountCollateral);
        vm.stopPrank();
    }

    /**
     * This test checks if the function reverts if the redeem amount is zero
     */
    function testRevertsIfRedeemAmountIsZero() public depositedCollateral {
        vm.startPrank(user);
        vm.expectRevert(DSCEngine.DSCEngine__AmountMustBeMoreThanZero.selector);
        dsce.redeemCollateral(address(weth), 0);
        vm.stopPrank();
    }

    /**
     * This test checks if the function can redeem collateral
     */
    function testCanRedeemCollateral() public depositedCollateral {
        // arrange: start prank as user
        vm.startPrank(user);
        // sanity check: check starting collateral balance from modifier
        uint256 startingCollateralBalance = dsce.getCollateralBalanceOfUser(user, address(weth));
        assertEq(startingCollateralBalance, amountCollateral);

        // act: redeem collateral
        dsce.redeemCollateral(address(weth), amountCollateral);

        // assert: check collateral balance after redeem
        uint256 collateralBalance = dsce.getCollateralBalanceOfUser(user, address(weth));
        assertEq(collateralBalance, 0);
        vm.stopPrank();
    }

    /**
     * This test checks if the function emits the correct event
     */
    function testEmitCollateralRedeemedWithCorrectArgs() public depositedCollateral {
        // This tells foundry to expect an event to be emitted with these exact parameters
        // The 4 'true' values mean we want to check all 4 indexed paramters of the event
        vm.expectEmit(true, true, true, true, address(dsce));

        // This is the event we expect to be emitted, with these exact parameters:
        // - user (from): who is redeeming the collateral
        // - user (to): who is receiving the collateral (could be a liquidator)
        // - token: the address of the token being redeemed
        // - amount: the amount of the collateral token being redeemed
        emit CollateralRedeemed(user, user, address(weth), amountCollateral);
        
        // start acting as user
        vm.startPrank(user);

        // call the function that should emit the event
        dsce.redeemCollateral(address(weth), amountCollateral);

        // stop acting as the user
        vm.stopPrank();
    }

    // //////////////////////////////////
    // // redeemCollateralForDsc Tests //
    // //////////////////////////////////

    // function testMustRedeemMoreThanZero() public depositedCollateralAndMintedDsc {}

    // function testCanRedeemDepositedCollateral() public {}

    // ////////////////////////
    // // healthFactor Tests //
    // ////////////////////////

    // function testProperlyReportsHealthFactor() public depositedCollateralAndMintedDsc {}

    // function testHealthFactorCanGoBelowOne() public {}

    // ///////////////////////
    // // Liquidation Tests //
    // ///////////////////////

    // function testMustImproveHealthFactorOnLiquidation() public {}

    // function testCantLiquidateGoodHealthFactor() public {}

    // modifier liquidated() {
    //     _;
    // }

    // function testLiquidationPayoutIsCorrect() public liquidated {}

    // function testUserStillHasSomeEthAfterLiquidation() public liquidated {}

    // function testLiquidatorTakesOnUsersDebt() public liquidated {}

    // function testUserHasNoMoreDebt() public liquidated {}

    // ////////////////////////////////
    // // View & Pure Function Tests //
    // ////////////////////////////////

    // function testGetCollateralTokenPriceFeed() public {}

    // function testGetCollateralToken() public {}

    // function testGetMinHealthFactor() public {}

    // function testGetLiquidationThreshold() public {}

    // function testGetAccountCollateralValueFromInformation() public depositedCollateral {}

    // function testGetCollateralBalanceOfUser() public {}

    // function testGetAccountCollateralValue() public {}

    // function testGetDsc() public {}

    // function testLiquidationPrecision() public {}
}