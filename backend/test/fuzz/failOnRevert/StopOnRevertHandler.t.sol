// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import { Test } from "forge-std/Test.sol";

import { DecentralizedStableCoin } from "../../../src/DecentralizedStableCoin.sol";
import { DSCEngine } from "../../../src/DSCEngine.sol";

import { ERC20Mock } from "../../mocks/ERC20Mock.sol";
import { MockV3Aggregator } from "../../mocks/MockV3Aggregator.sol";

/**
 * @title StopOnRevertHandler 
 * @author Loc Giang
 * @notice This contract is a test handler fuzzing test
 * it manages interactions with a Decentralized Stablecoin system
 */
contract StopOnRevertHandler is Test {

    DecentralizedStableCoin public dsc;
    DSCEngine public dsce;

    ERC20Mock public weth;
    ERC20Mock public wbtc;
    MockV3Aggregator public ethUsdPriceFeed;
    MockV3Aggregator public btcUsdPriceFeed;

    // Ghost variables
    uint96 public constant MAX_DEPOSIT_SIZE = type(uint96).max;

    constructor(DSCEngine _dscEngine, DecentralizedStableCoin _dsc) {
        dsce = _dscEngine;
        dsc = _dsc;
        
        address[] memory collateralTokens = dsce.getCollateralTokens();
        weth = ERC20Mock(collateralTokens[0]);
        wbtc = ERC20Mock(collateralTokens[1]);

        ethUsdPriceFeed = MockV3Aggregator(dsce.getCollateralTokenPriceFeed(address(weth)));
        btcUsdPriceFeed = MockV3Aggregator(dsce.getCollateralTokenPriceFeed(address(wbtc)));
    }

    /////////////////////
    // DSCEngine Tests //
    /////////////////////

    function mintAndDepositCollateral(uint256 collateralSeed, uint256 amountCollateral) public {
        amountCollateral = bound(amountCollateral, 1, MAX_DEPOSIT_SIZE);
        ERC20Mock collateral = _getCollateralFromSeed(collateralSeed);

        vm.startPrank(msg.sender);
        collateral.mint(msg.sender, amountCollateral);
        collateral.approve(address(dsce), amountCollateral);
        dsce.depositCollateral(address(collateral), amountCollateral);
        vm.stopPrank();
    }

    function redeemCollateral(uint256 collateralSeed, uint256 amountCollateral) public {
        ERC20Mock collateral = _getCollateralFromSeed(collateralSeed);
        uint256 maxCollateral = dsce.getCollateralBalanceOfUser(msg.sender, address(collateral));

        amountCollateral = bound(amountCollateral, 0, MAX_DEPOSIT_SIZE);

        if (amountCollateral == 0) {
            return;
        }

        vm.prank(msg.sender);
        dsce.redeemCollateral(address(collateral), amountCollateral);
    }


    ///////////////////////////
    // Stablecoin Operations //
    ///////////////////////////

    /////////////////
    // Liquidation //
    /////////////////

    //////////////////////
    // Price Management //
    //////////////////////

    // helper function
    function _getCollateralFromSeed(
        uint256 collateralSeed
    ) 
        private 
        view 
        returns(ERC20Mock) 
    {
        // if even return weth, (0, 2, 4) should be 0
        if (collateralSeed % 2 == 0) {
            return weth;
        } else {
            return wbtc;
        }
    }

}