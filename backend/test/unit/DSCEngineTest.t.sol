// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

contract DSCEngineTest {
    function setUp() external {}

    ///////////////////////
    // Constructor Tests //
    ///////////////////////

    function testRevertsIfTokenLengthDoesntMatchPriceFeed() public {}

    /////////////////
    // Price Tests //
    /////////////////

    function testGetTokenAmountFromUsd() public {}

    function testGetUsdValue() public {}

    /////////////////////////////
    // depositCollateral Tests //
    /////////////////////////////

    function testRevertsIfTransferFromFails() public {}

    function testRevertsIfCollateralZero() public {}

    function testRevertsWithUnapprovedCollateral() public {}

    modifier depositedCollateral() {
        _;
    }

    function testCanDepositCollateralWithoutMinting() public {}

    function testCanDepositedCollateralAndGetAccountInfo() public depositedCollateral {}


    ///////////////////////////////////////
    // depositCollateralAndMintDsc Tests //
    ///////////////////////////////////////

    function testRevertsIfMintedDscBreaksHealthFactor() public {}

    modifier depositedCollateralAndMintedDsc() {
        _;
    }

    function testCanMintWithDepositedCollateral() public depositedCollateralAndMintedDsc {}

    ///////////////////
    // mintDsc Tests //
    ///////////////////

    function testRevertsIfMintFails() public {}

    function testRevertsIfMintAmountIsZero() public {}

    function testRevertsIfMintAmountBreaksHealthFactor() public {}

    function testCanMintDsc() public depositedCollateral {}

    ///////////////////
    // burnDsc Tests //
    ///////////////////

    function testRevertsIfBurnAmountIsZero() public {}

    function testCantBurnMoreThanUserHas() public {}

    function testCanBurnDsc() public depositedCollateralAndMintedDsc {}

    ////////////////////////////
    // redeemCollateral Tests //
    ////////////////////////////

    function testRevertsIfTransferFails() public {}

    function testRevertsIfRedeemAmountIsZero() public {}

    function testCanRedeemCollateral() public depositedCollateral {}

    function testEmitCollateralRedeemedWithCorrectArgs() public depositedCollateral {}

    //////////////////////////////////
    // redeemCollateralForDsc Tests //
    //////////////////////////////////

    function testMustRedeemMoreThanZero() public depositedCollateralAndMintedDsc {}

    function testCanRedeemDepositedCollateral() public {}

    ////////////////////////
    // healthFactor Tests //
    ////////////////////////

    function testProperlyReportsHealthFactor() public depositedCollateralAndMintedDsc {}

    function testHealthFactorCanGoBelowOne() public {}

    ///////////////////////
    // Liquidation Tests //
    ///////////////////////

    function testMustImproveHealthFactorOnLiquidation() public {}

    function testCantLiquidateGoodHealthFactor() public {}

    modifier liquidated() {
        _;
    }

    function testLiquidationPayoutIsCorrect() public liquidated {}

    function testUserStillHasSomeEthAfterLiquidation() public liquidated {}

    function testLiquidatorTakesOnUsersDebt() public liquidated {}

    function testUserHasNoMoreDebt() public liquidated {}

    ////////////////////////////////
    // View & Pure Function Tests //
    ////////////////////////////////

    function testGetCollateralTokenPriceFeed() public {}

    function testGetCollateralToken() public {}

    function testGetMinHealthFactor() public {}

    function testGetLiquidationThreshold() public {}

    function testGetAccountCollateralValueFromInformation() public depositedCollateral {}

    function testGetCollateralBalanceOfUser() public {}

    function testGetAccountCollateralValue() public {}

    function testGetDsc() public {}

    function testLiquidationPrecision() public {}
}