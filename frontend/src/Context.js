import {createContext, useState, useContext, useEffect} from 'react';
import {getContracts} from './utils/ContractUtils';

export const UserContext = createContext();

// Custom hook to use the context
export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};

// Provider component
export const UserProvider = ({children}) => {
    const [userData, setUserData] = useState({
        address: null,
        ethBalance: '0',
        wethBalance: '0',
        dscBalance: '0',
        totalCollateralValueInUsd: '0',
        healthFactor: '0'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [contracts, setContracts] = useState(null);

    const connectWallet = async () => {

        try {
            setLoading(true);
            setError(null);

            // Check if MetaMask is installed
            if (!window.ethereum) {
                throw new Error('Please install MetaMask');
            }

            // Request account access
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });

            const userAddress = accounts[0];

            // Get contracts
            const contractInstances = await getContracts();
            setContracts(contractInstances);

            // Update address and fetch data
            setUserData(prev => ({
                ...prev,
                address: userAddress
            }))
            await fetchUserDataWithContracts(userAddress, contractInstances);
        } catch (err) {
            setError(err.message);
            console.error('Wallet connection failed:', err);
        } finally {
            setLoading(false);
        }
    };

    // Function to fetch user data with contracts
    const fetchUserDataWithContracts = async (userAddress, contractInstances) => {
        try {
            const { dsce, dsc, weth, signer } = contractInstances;
            const [
                ethBalance,
                wethBalance,
                dscBalance,
                totalCollateralValueInUsd,
                healthFactor,
            ] = await Promise.all([
                signer.provider.getBalance(userAddress), // Fix: add userAddress parameter
                weth.balanceOf(userAddress),
                dsc.balanceOf(userAddress),
                dsce.getAccountCollateralValue(userAddress), // Fix: correct method name
                dsce.getHealthFactor(userAddress),
            ]);

            setUserData({
                address: userAddress,
                ethBalance: ethBalance.toString(),
                wethBalance: wethBalance.toString(),
                dscBalance: dscBalance.toString(),
                totalCollateralValueInUsd: totalCollateralValueInUsd.toString(),
                healthFactor: healthFactor.toString(),
            })
        } catch (err) {
            setError(err.message);
            console.error('Failed to fetch user data:', err)
        }
    }

    // Function to fetch user data
    const fetchUserData = async () => {
        if (!userData.address) return;

        setLoading(true);
        setError(null);

        try {
            const {dsce, dsc, weth, signer} = await getContracts();
            const userAddress = await signer.getAddress();
            
            const [
                ethBalance,
                wethBalance,
                dscBalance,
                totalCollateralValueInUsd,
                healthFactor,
            ] = await Promise.all([
                signer.provider.getBalance(userAddress), // Fix: add userAddress parameter
                weth.balanceOf(userAddress),
                dsc.balanceOf(userAddress),
                dsce.getAccountCollateralValue(userAddress), // Fix: correct method name
                dsce.getHealthFactor(userAddress),
            ]);
            
            setUserData({
                address: userAddress,
                ethBalance: ethBalance.toString(),
                wethBalance: wethBalance.toString(),
                dscBalance: dscBalance.toString(),
                totalCollateralValueInUsd: totalCollateralValueInUsd.toString(),
                healthFactor: healthFactor.toString(),
            });
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false);
        }
    };

    // Function to refresh user data (can be called from any component)
    const refreshUserData = async () => {
        if (userData.address && contracts) {
            await fetchUserDataWithContracts(userData.address, contracts);
        } else if (userData.address) {
            await fetchUserData();
        }
    };

    // Function to disconnect wallet
    const disconnectWallet = () => {
        setUserData({
            address: null,
            ethBalance: '0',
            wethBalance: '0',
            dscBalance: '0',
            totalCollateralValueInUsd: '0',
            healthFactor: '0'
        });
        setContracts(null);
        setLoading(false);
    };

    // Function to update specific balance (for optimization)
    const updateBalance = (balanceType, newValue) => {
        setUserData(prev => ({
            ...prev,
            [balanceType]: newValue
        }));
    };

    // Listen for account changes
    useEffect(() => {
        if (window.ethereum) {
            const handleAccountsChanged = (accounts) => {
                if (accounts.length === 0) {
                    disconnectWallet();
                } else if (accounts[0] !== userData.address) {
                    // Auto-connect to new account
                    connectWallet();
                }
            };

            const handleChainChanged = () => {
                // Refresh page on network change
                window.location.reload();
            };

            window.ethereum.on('accountsChanged', handleAccountsChanged);
            window.ethereum.on('chainChanged', handleChainChanged);

            return () => {
                window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
                window.ethereum.removeListener('chainChanged', handleChainChanged);
            };
        }
    }, [userData.address]);

    // Auto-fetch data when address changes
    useEffect(() => {
        if (userData.address) {
            fetchUserDataWithContracts(userData.address, contracts);
        }
    }, [userData.address, contracts]);

    const contextValue = {
        // State
        userData,
        loading,
        error,
        contracts,

        // Functions
        connectWallet,
        disconnectWallet,
        fetchUserData,
        refreshUserData,
        updateBalance
    };

    return (
        <UserContext.Provider value ={contextValue}>
            {children}
        </UserContext.Provider>
    );
};