// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

// libraries and testing frameworks
import { Test } from "forge-std/Test.sol";
import { console } from "forge-std/console.sol";
import { StdInvariant } from "forge-std/StdInvariant.sol";

// Core contracts
import { DecentralizedStableCoin } from "../../../src/DecentralizedStableCoin.sol";
import { DSCEngine } from "../../../src/DSCEngine.sol";

// Deployment scripts
import { HelperConfig } from "../../../script/HelperConfig.s.sol";
import { DeployDSC } from "../../../script/DeployDSC.s.sol";

// Test contracts and mocks
import { StopOnRevertHandler } from "./StopOnRevertHandler.t.sol";
import { ERC20Mock } from "../../../test/mocks/ERC20Mock.sol";

/**
 * @title StopOnRevertInvariants
 * @author Loc Giang
 * @notice This contract defines and check system invariants
 */
contract StopOnRevertInvariants is StdInvariant, Test {
    DecentralizedStableCoin dsc;
    DSCEngine dsce;
    HelperConfig helperConfig;

    address ethUsdPriceFeed;
    address btcUsdPriceFeed;
    address weth;
    address wbtc;

    StopOnRevertHandler handler;

    function setUp() external {
        // deploy core contracts
        DeployDSC deployer = new DeployDSC();
        (dsc, dsce, helperConfig) = deployer.run();

        // get network configuration
        (ethUsdPriceFeed, btcUsdPriceFeed, weth, wbtc, ) = helperConfig.activeNetworkConfig();

        // create and target handler
        handler = new StopOnRevertHandler();
        targetContract(address(handler));
    }

    // invariant function that ensure the protocol remains properly collateralized
    function invariant_protocolMustHaveMoreValueThanTotalSupplyDollars() public view {
        // get total stablecoin supply
        uint256 totalSupply = dsc.totalSupply();

        // get collateral balance
        uint256 wethDeposited = ERC20Mock(weth).balanceOf(address(dsce));
        uint256 wbtcDeposited = ERC20Mock(wbtc).balanceOf(address(dsce));

        // covert collateral to USD value
        uint256 wethValue = dsce.getUsdValue(weth, wethDeposited);
        uint256 wbtcValue = dsce.getUsdValue(wbtc, wbtcDeposited);

        // debug logging
        console.log("wethValue: %s", wethValue);
        console.log("wbtcValue: %s", wbtcValue);

        // assert invariant
        assert(wethValue + wbtcValue >= totalSupply);
    }

    function invariant_gettersCantRevert() public view {
        dsce.getAdditionalFeedPrecision();
        dsce.getCollateralTokens();
        dsce.getLiquidationBonus();
        dsce.getLiquidationThreshold();
        dsce.getMinHealthFactor();
        dsce.getPrecision();
        dsce.getDsc();
    }
}