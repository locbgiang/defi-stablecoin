// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import { EnumerableSet } from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import { Test } from "forge-std/Test.sol";
import { console } from "forge-std/console.sol";

import { DSCEngine, AggregatorV3Interface } from "../../../src/DSCEngine.sol";
import { DecentralizedStableCoin } from "../../../src/DecentralizedStableCoin.sol";
import { MockV3Aggregator } from "../../mocks/MockV3Aggregator.sol";
import { ERC20Mock } from "../../mocks/ERC20Mock.sol";

contract ContinueOnRevertHandler {
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
}