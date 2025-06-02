import {createContext, useState, useContext, useEffect, useCallback} from 'react';
import {getContracts} from './utils/ContractUtils';

export const UserContext = createContext();

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};

const initialUserData = {
    address: null,
    ethBalance: '0',
    wethBalance: '0',
    dscBalance: '0',
    totalCollateralValueInUsd: '0',
    healthFactor: '0'
};

export const UserProvider = ({children}) => {
    const [userData, setUserData] = useState(initialUserData);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [contracts, setContracts] = useState(null);

    // Single function to fetch user data
    const fetchUserData = useCallback(async (userAddress, contractInstances) => {
        if (!userAddress) return;
        
        try {
            setLoading(true);
            setError(null);

            // Get contracts if not provided
            const contracts = contractInstances || await getContracts();
            const { dsce, dsc, weth, signer } = contracts;

            const [
                ethBalance,
                wethBalance,
                dscBalance,
                totalCollateralValueInUsd,
                healthFactor,
            ] = await Promise.all([
                signer.provider.getBalance(userAddress),
                weth.balanceOf(userAddress),
                dsc.balanceOf(userAddress),
                dsce.getAccountCollateralValue(userAddress),
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

            return contracts;
        } catch (err) {
            setError(err.message);
            console.error('Failed to fetch user data:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const connectWallet = useCallback(async () => {
        try {
            if (!window.ethereum) {
                throw new Error('Please install MetaMask');
            }

            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });

            const userAddress = accounts[0];
            const contractInstances = await fetchUserData(userAddress);
            
            if (contractInstances) {
                setContracts(contractInstances);
            }
        } catch (err) {
            setError(err.message);
            console.error('Wallet connection failed:', err);
        }
    }, [fetchUserData]);

    const disconnectWallet = useCallback(() => {
        setUserData(initialUserData);
        setContracts(null);
        setError(null);
    }, []);

    const refreshUserData = useCallback(() => {
        if (userData.address) {
            fetchUserData(userData.address, contracts);
        }
    }, [userData.address, contracts, fetchUserData]);

    // Event listeners
    useEffect(() => {
        if (!window.ethereum) return;

        const handleAccountsChanged = (accounts) => {
            if (accounts.length === 0) {
                disconnectWallet();
            } else if (accounts[0] !== userData.address) {
                connectWallet();
            }
        };

        const handleChainChanged = () => window.location.reload();

        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);

        return () => {
            window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
            window.ethereum.removeListener('chainChanged', handleChainChanged);
        };
    }, [userData.address, connectWallet, disconnectWallet]);

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