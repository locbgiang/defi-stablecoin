import {createContext, useState, useContext, useEffect, useCallback} from 'react';
import {getContracts} from '../utils/ContractUtils';
export const UserContext = createContext();

/**
 * Custom hook to access user context
 * @returns {Object} - The user context containing user data
 */
export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};

// Default user data structure
const initialUserData = {
    address: null,
    ethBalance: '0',
    wethBalance: '0',
    dscBalance: '0',
    wethCollateralBalance: '0',
    totalCollateralValueInUsd: '0',
    healthFactor: '0',
};

/**
 * UserProvider component to manage user data and wallet connection
 */
export const UserProvider = ({children}) => {
    const [userData, setUserData] = useState(initialUserData);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [contracts, setContracts] = useState(null);

    // function to fetch user data and contract instances
    const fetchUserData = async () => {
        try {
            // Get contracts if not provided
            const {dsce, dsc, weth, signer} = await getContracts();
            const userAddress = await signer.getAddress();

            const [
                ethBalance,
                wethBalance,
                dscBalance,
                wethCollateralBalance,
                totalCollateralValueInUsd,
                healthFactor,
            ] = await Promise.all([
                signer.provider.getBalance(userAddress),
                weth.balanceOf(userAddress),
                dsc.balanceOf(userAddress),
                dsce.getCollateralBalanceOfUser(userAddress, weth.target),
                dsce.getAccountCollateralValue(userAddress),
                dsce.getHealthFactor(userAddress),
            ]);

            setUserData({
                address: userAddress,
                ethBalance: ethBalance.toString(),
                wethBalance: wethBalance.toString(),
                dscBalance: dscBalance.toString(),
                wethCollateralBalance: wethCollateralBalance.toString(),
                totalCollateralValueInUsd: totalCollateralValueInUsd.toString(),
                healthFactor: healthFactor.toString(),
            });

        } catch (err) {
            setError(err.message);
            console.error('Failed to fetch user data:', err);
        } 
    };

    const connectWallet = async () => {
        try {
            if (!window.ethereum) {
                throw new Error('Please install MetaMask');
            }

            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });

            // get contracts and store them
            const contractInstances = await getContracts();

            setContracts(contractInstances);
            await fetchUserData();
        } catch (err) {
            setError(err.message);
            console.error('Wallet connection failed:', err);
        }
    };

    const disconnectWallet = async () => {
        setUserData(initialUserData);
        //setContracts(null);
        //setError(null);
    };

    const refreshUserData = async () => {
        if (userData.address) {
            fetchUserData(userData.address, contracts);
        }
    };

    const contextValue = {
        userData,
        loading,
        error,
        contracts,
        connectWallet,
        disconnectWallet,
        refreshUserData,
    };

    return (
        <UserContext.Provider value={contextValue}>
            {children}
        </UserContext.Provider>
    );
};