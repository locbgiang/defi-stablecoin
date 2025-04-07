// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import { Test, console } from "forge-std/Test.sol";
import { DeployDSC } from "../../script/DeployDSC.s.sol";
import { DecentralizedStableCoin } from "../../src/DecentralizedStableCoin.sol";
import { DSCEngine } from "../../src/DSCEngine.sol";
import { HelperConfig } from "../../script/HelperConfig.s.sol";
import { ERC20Mock } from "../mocks/ERC20Mock.sol";
import { MockFailedTransferFrom } from "../mocks/MockFailedTransferFrom.sol";

contract DSCEngineTest is Test {

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
    uint256 public amountCollateral = 10 ether;
    

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

    // function testRevertsIfMintedDscBreaksHealthFactor() public {}

    // modifier depositedCollateralAndMintedDsc() {
    //     _;
    // }

    // function testCanMintWithDepositedCollateral() public depositedCollateralAndMintedDsc {}

    // ///////////////////
    // // mintDsc Tests //
    // ///////////////////

    // function testRevertsIfMintFails() public {}

    // function testRevertsIfMintAmountIsZero() public {}

    // function testRevertsIfMintAmountBreaksHealthFactor() public {}

    // function testCanMintDsc() public depositedCollateral {}

    // ///////////////////
    // // burnDsc Tests //
    // ///////////////////

    // function testRevertsIfBurnAmountIsZero() public {}

    // function testCantBurnMoreThanUserHas() public {}

    // function testCanBurnDsc() public depositedCollateralAndMintedDsc {}

    // ////////////////////////////
    // // redeemCollateral Tests //
    // ////////////////////////////

    // function testRevertsIfTransferFails() public {}

    // function testRevertsIfRedeemAmountIsZero() public {}

    // function testCanRedeemCollateral() public depositedCollateral {}

    // function testEmitCollateralRedeemedWithCorrectArgs() public depositedCollateral {}

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