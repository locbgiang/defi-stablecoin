// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import { DSCEngine } from "../../../src/DSCEngine.sol";
import { DecentralizedStableCoin } from "../../../src/DecentralizedStableCoin.sol";
import { HelperConfig } from "../../../script/HelperConfig.s.sol";
import { MockV3Aggregator } from "../../mocks/MockV3Aggregator.sol";
import { ERC20Mock } from "../../mocks/ERC20Mock.sol";
import { DeployDSC } from "../../../script/DeployDSC.s.sol";
import { ContinueOnRevertHandler } from "./ContinueOnRevertHandler.t.sol";

import { Test } from "forge-std/Test.sol";
import { console } from "forge-std/console.sol";
import { StdInvariant } from "forge-std/StdInvariant.sol";

/**
 * @title ContinueOnRevertInvariants
 * @author Loc Giang
 * @notice This is the main test contract
 * 1. Sets up the testing environment
 * 2. Defines invariants (properties that must always be true)
 * 3. Randomly selects functions from the handler
 */
contract ContinueOnRevertInvariants is StdInvariant, Test {
    // deploy contracts to interact with
    DSCEngine public dsce;
    DecentralizedStableCoin public dsc;
    HelperConfig public helperConfig;
    address public ethUsdPriceFeed;
    address public btcUsdPriceFeed;
    address public weth;
    address public wbtc;

    // constant and configuration
    uint256 amountCollateral = 10 ether;
    uint256 amountToMint = 100 ether;
    uint256 public constant STARTING_USER_BALANCE = 10 ether;
    address public constant USER = address(1);
    uint256 public constant MIN_HEALTH_FACTOR = 1e18;
    uint256 public constant LIQUIDATION_THRESHOLD = 50;

    // liquidation variables
    address public liquidator = makeAddr("liquidator");
    uint256 public collateralToCover = 20 ether;

    ContinueOnRevertHandler public handler;

    // setUp runs before every test function
    // allows you to reset the state of the contract
    function setUp() external {
        DeployDSC deployer = new DeployDSC();
        (dsc, dsce, helperConfig) = deployer.run();
        (ethUsdPriceFeed, btcUsdPriceFeed, weth, wbtc,) = helperConfig.activeNetworkConfig();
        handler = new ContinueOnRevertHandler(dsce, dsc);
        targetContract(address(handler));
    }

    // defines invariants (properties that must always be true)
    // ensures the protocol always has enough collateral to back all minted stablecoin
    function invariant_protocolMustHaveMoreValueThanTotalSupplyDollars() public view {
        // getting the total supply
        uint256 totalSupply = dsc.totalSupply();

        // getting the collateral balance (weth and wbtc)
        uint256 wethDeposited = ERC20Mock(weth).balanceOf(address(dsce));
        uint256 wbtcDeposited = ERC20Mock(wbtc).balanceOf(address(dsce));

        // converting to USD value
        uint256 wethUsdValue = dsce.getUsdValue(weth, wethDeposited);
        uint256 wbtcUsdValue = dsce.getUsdValue(wbtc, wbtcDeposited);

        // assert that wethUsdValue + wbtcUsdValue >= totalSupply
        assert(wethUsdValue + wbtcUsdValue >= totalSupply);
    }

    // logs results via callSummary
    function invariant_callSummary() public view {
        handler.callSummary();
    }
}