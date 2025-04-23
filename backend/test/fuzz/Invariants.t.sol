// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.18;

// // frameworks and libraries
// import { Test } from "forge-std/Test.sol";
// import { StdInvariant } from "forge-std/StdInvariant.sol";
// import { console } from "forge-std/console.sol";
// // contract and scripts
// import { DeployDSC } from "../../script/DeployDSC.s.sol";
// import { DecentralizedStableCoin } from "../../src/DecentralizedStableCoin.sol";
// import { DSCEngine } from "../../src/DSCEngine.sol";
// import { HelperConfig } from "../../script/HelperConfig.s.sol";
// // mocks and tests
// import { ERC20Mock } from "../mocks/ERC20Mock.sol";
// import { Handler } from "./Handler.t.sol";

// contract Invariant is StdInvariant, Test {
//     DeployDSC deployer;
//     DecentralizedStableCoin dsc;
//     DSCEngine dsce;
//     HelperConfig config;

//     address weth;
//     address wbtc;

//     Handler handler;

//     // setUp is ran before every set of fuzz
//     function setUp() external {
//         deployer = new DeployDSC();
//         (dsc, dsce, config) = deployer.run();
//         (,, weth, wbtc, ) = config.activeNetworkConfig();

//         // handler contains the functions
//         handler = new Handler(dsc, dsce);
//         targetContract(address(handler));
//     }

//     // after setup and fuzz 
//     // run these two invariant functions to make sure everything is working
//     function invariant_protocolMustHaveMoreValueThanTotalSupply() public {
//         uint256 totalSupplyDSC = dsc.totalSupply();
//         uint256 totalWethDeposited = ERC20Mock(weth).balanceOf(address(dsce));
//         uint256 totalWbtcDeposited = ERC20Mock(wbtc).balanceOf(address(dsce));

//         uint256 wethValueInUsd = dsce.getUsdValue(weth, totalWethDeposited);
//         uint256 wbtcValueInUsd = dsce.getUsdValue(wbtc, totalWbtcDeposited);

//         console.log("weth value: ", wethValueInUsd);
//         console.log("wbtc value: ", wbtcValueInUsd);
//         console.log("total supply: ", totalSupplyDSC);
        
//         // revert if total DSC is greater than collateral
//         assert(wethValueInUsd + wbtcValueInUsd >= totalSupplyDSC);
//     }

//     function invariant_gettersShouldNotRevert() public {
//         // if these return revert, then the function also reverts
//         dsce.getLiquidationBonus();
//         dsce.getPrecision();
//     }
// }