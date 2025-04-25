import { createContext, useContext, useState, useEffect } from 'react';
import { parseEther } from 'ethers';
import DSCEngineABI from "../contracts/DSCEngine.json";
import DscABI from "../contracts/DecentralizedStableCoin.json";

const Web3Context = createContext();

/**
 * This is a React context provider (data) for managing the web3 state.
 * Handles interactions for the Decentralized Stable Coin (DSC) application.
 */

export function Web3Provider({ children }) {
    const [account, setAccount] = useState(null);
    const [provider, setProvider] = useState(null);
    const [dsceEngine, setDscEngine] = useState(null);
    const [dsc, setDsc] = useState(null);
    
    
    const connectWallet = async () => {
        if (window.ethereum) {
            try {
                const account = await window.ethereum.request({
                    method: 'eth_requestAccounts',
                });
                const provider = new parseEther.providers.Web3Provider(window.ethereum);
                setAccount(account[0]);
                setProvider(provider);

                // Initialize contract instances
                const dscEngine = new parseEther.Contract(
                    DSC_ENGINE_ADDRESS,
                    DSCEngineABI,
                    provider.getSigner()
                );
                const dsc = new parseEther.Contract(
                    DSC_ADDRESS,
                    DscABI,
                    provider.getSigner()
                );

                setDscEngine(dscEngine);
                setDsc(dsc);
            } catch (error) {
                console.error("Error connecting to wallet:", error);
            }
        } 
    };

    return (
        <Web3Context.Provider value={{
            account,
            provider,
            dsceEngine,
            dsc,
            connectWallet
        }}>
            {children}
        </Web3Context.Provider>
    )
}

export function useWeb3() {
    return useContext(Web3Context);
}