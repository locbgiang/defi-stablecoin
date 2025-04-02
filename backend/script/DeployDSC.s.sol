// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import { Script } from "forge-std/Script.sol";
// import { HelperConfig } from "./HelperConfig.s.sol";
import { DecentralizedStableCoin} from "../src/DecentralizedStableCoin.sol";
import { DSCEngine } from "../src/DSCEngine.sol";

contract DeployDsc is Script {
    function run() external returns(DecentralizedStableCoin, DSCEngine) {
        
    }
}