// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import { EnumerableSet } from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import { Test } from "forge-std/Test.sol";
import { console } from "forge-std/console.sol";

import { DSCEngine, AggregatorV3Interface } from "../../../src/DSCEngine.sol";
import { DecentralizedStableCoin } from "../../../src/DecentralizedStableCoin.sol";
import { MockV3Aggregator } from "../../mocks/MockV3Aggregator.sol";
import { ERC20Mock } from "../../mocks/ERC20Mock.sol";

/**
 * @title ContinueOnRevertHandler
 * @author Loc Giang
 * @notice This is the handler contract
 * it provides functions for the fuzzer to call randomly.
 */
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

        vm.startPrank(msg.sender);
        // mint the collateral tokens to the caller
        collateral.mint(address(msg.sender), amountCollateral);
        collateral.approve(address(dsce), amountCollateral);

        // deposit the collateral into the dsc engine
        dsce.depositCollateral(address(collateral), amountCollateral);
        vm.stopPrank();
    }

    function redeemCollateral (uint256 collateralSeed, uint256 amountCollateral) public {
        // bound the imput amount to prevent overflow
        amountCollateral = bound(amountCollateral, 0, MAX_DEPOSIT_SIZE);

        // select the collateral token based on the seed
        ERC20Mock collateral = _getCollateralFromSeed(collateralSeed);

        // call the engine to redeem collateral
        dsce.redeemCollateral(address(collateral), amountCollateral);
    }

 
    // input: burn how many?
    function burnDsc (uint256 amountDsc) public {
        // bound the input amount to prevent overflow
        amountDsc = bound(amountDsc, 0, dsc.balanceOf(address(msg.sender)));

        // bunr the dsc tokens
        dsc.burn(amountDsc);
    }

    // input: mint how many?
    function mintDsc (uint256 amountToMint) public {
        // bound the input amount to prevent overflow
        amountToMint = bound(amountToMint, 0, MAX_DEPOSIT_SIZE);
        
        // mint the dsc tokens
        dsc.mint(address(msg.sender), amountToMint);
    }

    // input: liquidate how many?
    function liquidate (
        uint256 collateralSeed, 
        address userToBeLiquidated, 
        uint256 debtToCover
    ) 
        public 
    {
        // bound the input amount to prevent overflow
        debtToCover = bound(debtToCover, 0, dsc.balanceOf(userToBeLiquidated));

        // select the collateral token based on the seed
        ERC20Mock collateral = _getCollateralFromSeed(collateralSeed);

        // call the engine to liquidate the user
        dsce.liquidate(userToBeLiquidated, address(collateral), debtToCover);
    }

    /////////////////////////////
    // DecentralizedStableCoin //    
    /////////////////////////////

    function transferDsc (
        uint256 amountToTransfer, 
        address to
    ) 
        public 
    {
        // bound the input amount to prevent overflow
        amountToTransfer = bound(amountToTransfer, 0, dsc.balanceOf(address(msg.sender)));

        vm.prank(msg.sender);
        dsc.transfer(to, amountToTransfer);
    }

    ////////////////
    // Aggregator //
    ////////////////

    function callSummary() external view {
        console.log("Weth total deposited", weth.balanceOf(address(dsce)));
        console.log("Wbtc total deposited", wbtc.balanceOf(address(dsce)));
        console.log("Total supply of DSC", dsc.totalSupply());
    }

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

    function updateCollateralPrice (
        uint256,
        uint256 collateralSeed
    ) 
        public 
    {
        int256 intNewPrice = 0;
        ERC20Mock collateral = _getCollateralFromSeed(collateralSeed);
        MockV3Aggregator priceFeed = MockV3Aggregator(
            dsce.getCollateralTokenPriceFeed(address(collateral))
        );
        priceFeed.updateAnswer(intNewPrice);
    }
}