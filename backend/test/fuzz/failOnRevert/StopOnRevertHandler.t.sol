// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import { DecentralizedStableCoin } from "../../../src/DecentralizedStableCoin.sol";
import { DSCEngine } from "../../../src/DSCEngine.sol";

/**
 * @title StopOnRevertHandler 
 * @author Loc Giang
 * @notice This contract is a test handler fuzzing test
 * it manages interactions with a Decentralized Stablecoin system
 */
contract StopOnRevertHandler {

    DecentralizedStableCoin public dsc;
    DSCEngine public dsce;

    ///////////////
    // Functions //
    ///////////////

    constructor(DSCEngine _dscEngine, DecentralizedStableCoin _dsc) {
        dsce = _dscEngine;
        dsc = _dsc;
        // set up collateral token and pricefeed
    }

    ///////////////////////////
    // Collateral Management //
    ///////////////////////////

    ///////////////////////////
    // Stablecoin Operations //
    ///////////////////////////

    /////////////////
    // Liquidation //
    /////////////////

    //////////////////////
    // Price Management //
    //////////////////////

}