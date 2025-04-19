// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import { EnumerableSet } from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import { Test } from "forge-std/Test.sol";
import { console } from "forge-std/console.sol";

import { DSCEngine, AggregatorV3Interface } from "../../../src/DSCEngine.sol";
import { DecentralizedStableCoin } from "../../../src/DecentralizedStableCoin.sol";
import { MockV3Aggregator } from "../../mocks/MockV3Aggregator.sol";
import { ERC20Mock } from "../../mocks/ERC20Mock.sol";

contract ContinueOnRevertHandler is Test {
    // deploy contracts to interact with
    DSCEngine public dsce;
    DecentralizedStableCoin public dsc;
    MockV3Aggregator public ethUsdPriceFeed;
    MockV3Aggregator public btcUsdPriceFeed;
    ERC20Mock public weth;
    ERC20Mock public wbtc;

    // ghost variables
    uint96 public constant MAX_DEPOSIT_SIZE = type(uint96).max;

    constructor (DSCEngine _dsce, DecentralizedStableCoin _dsc) {
        dsce = _dsce;
        dsc = _dsc;
        
        address[] memory collateralTokens = dsce.getCollateralTokens();
        weth = ERC20Mock(collateralTokens[0]);
        wbtc = ERC20Mock(collateralTokens[1]);

        ethUsdPriceFeed =  MockV3Aggregator(
            dsce.getCollateralTokenPriceFeed(address(weth))
        );
        btcUsdPriceFeed = MockV3Aggregator(
            dsce.getCollateralTokenPriceFeed(address(wbtc))
        );
    }

    // Functions to interact with

    ///////////////
    // DSCEngine //
    ///////////////

    function mintAndDepositCollateral (uint256 collateralSeed, uint256 amountCollateral) public {
        // bound the collateral amount to prevent overflow
        amountCollateral = bound(amountCollateral, 1, MAX_DEPOSIT_SIZE);

        // get either weth or wbtc based on the seed
        ERC20Mock collateral = _getCollateralFromSeed(collateralSeed);

        // mint the collateral tokens to the caller
        collateral.mint(address(this), amountCollateral);

        // deposit the collateral into the dsc engine
        dsce.depositCollateral(address(collateral), amountCollateral);
    }

    function redeemCollateral (uint256 collateralSeed, uint256 amountCollateral) public {
        // bound the imput amount to prevent overflow
        amountCollateral = bound(amountCollateral, 0, MAX_DEPOSIT_SIZE);

        // select the collateral token based on the seed
        ERC20Mock collateral = _getCollateralFromSeed(collateralSeed);

        // call the engine to redeem collateral
        dsce.redeemCollateral(address(collateral), amountCollateral);
    }

    // function burnDsc () {}

    // function mintDsc () {}

    // function liquidate () {}

    /////////////////////////////
    // DecentralizedStableCoin //    // funtion mintAndDepositCollateral () {}

    // function redeemCollateral () {}

    // function burnDsc () {}

    // function mintDsc () {}

    // function liquidate () {} 
    /////////////////////////////

    // function transferDsc () {}

    ////////////////
    // Aggregator //
    ////////////////

    function _getCollateralFromSeed (
        uint256 collateralSeed
    ) 
        private 
        view 
        returns(ERC20Mock) 
    {
        if (collateralSeed % 2 == 0) {
            return weth;
        } else {
            return wbtc;
        }
    }

    // function updateCollateralPrice () {}

    // function callSummary () {}
}