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
        vm.startBroadcast(deployerKey);
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