// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import { Script } from "forge-std/Script.sol";
import { HelperConfig } from "./HelperConfig.s.sol";
import { DecentralizedStableCoin} from "../src/DecentralizedStableCoin.sol";
import { DSCEngine } from "../src/DSCEngine.sol";

/**
 * @title DeployDSC
 * @author Loc Giang
 * @notice This contract deploys the DecentralizedStableCoin and DSCEngine contracts
 * == Return ==
    0: contract DecentralizedStableCoin 0x28809A72454095940fcF612fF5f4432c7F1e8Fef
    1: contract DSCEngine 0x2b34541A0507308F43E8cA1D9cd1600db41bC8C8
    2: contract HelperConfig 0xC7f2Cf4845C6db0e1a1e91ED41Bcd0FcC1b0E141
 */
contract DeployDSC is Script {
    address[] public tokenAddresses;
    address[] public priceFeedAddresses;
    HelperConfig helperConfig;

    function run() external returns(DecentralizedStableCoin, DSCEngine, HelperConfig) {
        helperConfig = new HelperConfig(); // this comes with our mocks

        // grab the network specific config
        // this will be the mock addresses if on a local chain (anvil)
        (address wethUsdPriceFeed, address wbtcUsdPriceFeed, address weth, address wbtc, uint256 deployerKey) = helperConfig.activeNetworkConfig();
        tokenAddresses = [weth, wbtc];
        priceFeedAddresses  = [wethUsdPriceFeed, wbtcUsdPriceFeed];

        // deployerKey is the private key of the deployer account
        // if on anvil it is the given key in HelperConfig contract
        // if on a testnet (sepolia) it is the private key of deployer account
        vm.startBroadcast();
        DecentralizedStableCoin dsc = new DecentralizedStableCoin();
        DSCEngine dsce = new DSCEngine(tokenAddresses, priceFeedAddresses, address(dsc));

        // do this so that the DSCEngine contract is allowed to mint and burn DSC
        // user will only interact with DSCEngine and not the DecentralizedStableCoin contract directly
        // require(msg.sender == owner()); will only pass when msg.sender == address(dsce)
        dsc.transferOwnership(address(dsce));
        vm.stopBroadcast();
        return (dsc, dsce, helperConfig);
    }
}