// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.18;

// import { Test } from "forge-std/Test.sol";

// import { DecentralizedStableCoin } from "../../src/DecentralizedStableCoin.sol";
// import { DSCEngine } from "../../src/DSCEngine.sol";

// import { ERC20Mock } from "../mocks/ERC20Mock.sol";
// import { MockV3Aggregator } from "../mocks/MockV3Aggregator.sol";

// contract Handler is Test {
//     DecentralizedStableCoin dsc;
//     DSCEngine dsce;

//     address weth;
//     address wbtc;

//     MockV3Aggregator public ethUsdPriceFeed;
//     uint256 MAX_DEPOSIT_SIZE = type(uint96).max;

//     constructor (DecentralizedStableCoin _dsc, DSCEngine _dsce) {
//         dsc = _dsc;
//         dsce = _dsce;

//         address[] memory collateralTokens = dsce.getCollateralTokens();
//         weth = address(ERC20Mock(collateralTokens[0]));
//         wbtc = address(ERC20Mock(collateralTokens[1]));

//         ethUsdPriceFeed = MockV3Aggregator(dsce.getCollateralTokenPriceFeed(weth));
//     }

//     function depositCollateralAndMintDsc(
//         uint256 collateralSeed, 
//         uint256 amountCollateral
//     ) 
//         public 
//     {
//         amountCollateral = bound(amountCollateral, 1, MAX_DEPOSIT_SIZE);
//         address collateral = _getCollateralFromSeed(collateralSeed);
//         vm.startPrank(msg.sender);
//         ERC20Mock(collateral).mint(msg.sender, amountCollateral);
//         ERC20Mock(collateral).approve(address(dsce), amountCollateral);
//         dsce.depositCollateral(collateral, amountCollateral);
//         vm.stopPrank();
//     }

//     function _getCollateralFromSeed(uint256 collateralSeed) private view returns(address) {
//         if (collateralSeed % 2 == 0) {
//             return weth;
//         } else {
//             return wbtc;
//         }
//     }
// }