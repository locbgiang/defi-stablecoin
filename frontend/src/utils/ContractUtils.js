import { BrowserProvider, Contract } from "ethers";
import { contractAddresses } from "../contracts/ContractAddresses";
import DSCEngineABI from "../contracts/DSCEngineABI.json";
import DecentralizedStableCoinABI from "../contracts/DecentralizedStableCoinABI.json";

/**
 * @author: Loc Giang
 * @description: This function initialize and interact the deployed contracts
 */
export const getContracts = async () => {
    // check for metamask
    if (!window.ethereum) throw new Error("MetaMask is not installed");

    // create a provider
    // window.ethereum object injected by metamaks
    // this provider allows frontend to interact with the eth blockchain
    const provider = new BrowserProvider(window.ethereum);

    // Request access to account - important step!
    await window.ethereum.request({
        method: "eth_requestAccounts",
    });

    // retrieves the singer
    // which represent the user's wallet
    // used to send transactions or sign messages on behalf of the user
    const signer = await provider.getSigner();

    // creates an instance of the dscengine contract
    // contract address, abi, and signer
    const dsce = new Contract(
        contractAddresses.DSCEngine,
        DSCEngineABI,
        signer
    );
    
    // creates an instance of the dsc contract
    const readOnlyDsc = new Contract(
        contractAddresses.DecentralizedStableCoin,
        DecentralizedStableCoinABI,
        provider
    );

    return { dsce, dsc: readOnlyDsc, signer };
};