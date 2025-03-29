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
// IERC20
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

    ///////////
    // Types //
    ///////////

    /////////////////////
    // State Variables //
    /////////////////////

    ////////////
    // Events //
    ////////////

    ///////////////
    // Modifiers //
    ///////////////

    ///////////////
    // Functions //
    ///////////////

    constructor() {}

    ////////////////////////
    // External Functions //
    ////////////////////////

    function depositCollateralAndMintDsc() {}

    function redeemCollateralForDsc() {}

    function redeemCollateral() {}

    function burnDsc() {}

    function liquidate() {}

    //////////////////////
    // Public Functions //
    //////////////////////

    function mintDsc() {}

    function depositCollateral() {}

    ///////////////////////
    // Private Functions //
    ///////////////////////

    function _redeemCollateral() {}

    function _burnDsc() {}

    //////////////////////////////////////////////
    // Private & Internal View & Pure Functions //
    //////////////////////////////////////////////

    function _getAccountInformation() {}

    function _healthFactor() {}

    function _getUsdValue() {}

    function _calculateHealthFactor() {}

    function _revertIfHealthFactorIsBroken() {}

    /////////////////////////////////////////////
    // External & Public View & Pure functions //
    /////////////////////////////////////////////

    function calculateHealthFactor() {}

    function getAccountInformation() {}

    function getUsdValue() {}

    function getCollateralBalanceOfUser() {}

    function getAccountCollateralValue() {}

    function getTokenAmountFromUsd() {}

    function getPrecision() {}

    function getAdditionalFeedPrecision() {}

    function getLiquidationThreshold() {}

    function getLiquidationBonus() {}

    function getLiquidationPrecision() {}

    function getMinHealthFactor() {}

    function getCollateralTokens() {}

    function getDsc() {}

    function getCollateralTokenPriceFeed() {}

    function getHealthFactor() {}
}