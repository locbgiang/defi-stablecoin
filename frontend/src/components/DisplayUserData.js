import { useState, useEffect } from "react"; 
import { getContracts } from "../utils/ContractUtils";
import { formatEther, parseEther, Contract } from "ethers";
import { useUser } from "../contexts/Context";
import './DisplayUserData.css';

export const DisplayUserData = () => {
    const { userData, connectWallet, disconnectWallet, loading, error, contracts, refreshUserData } = useUser();
    const [isExpanded, setIsExpanded] = useState(false);

    // Remove the loadUserData function since we'll use the context's refreshUserData
    console.log('User Data:', userData);

    // Auto-load data when component mounts and user connects
    useEffect(() => {
        if (userData.address && contracts) {
            refreshUserData();
        }
    }, [userData.address, contracts]);

    const formatAddress = (address) => {
        if (!address) return 'Not connected';
        return `${address}`;
    }

    const toggleDropdown = () => {
        setIsExpanded(!isExpanded);
    }

    const formatHealthFactor = (healthFactor) => {
        if (!healthFactor || healthFactor === '0') return '0.0000';
        return (parseFloat(healthFactor) / 1e18).toFixed(4);
    }

    const isHealthy = (healthFactor) => {
        if (!healthFactor || healthFactor === '0') return false;
        return parseFloat(healthFactor) > 1e18; // > 1.0 in 18 decimals
    }

    return (
        <div className='user-data-container'>
            <div className='user-data-header' onClick={toggleDropdown}>
                <h2 className='user-data-title'>
                    User Dashboard
                    <span className={`dropdown-arrow ${isExpanded ? 'expanded' : ''}`}>▼</span>
                </h2>
            </div>

            {isExpanded && (
                <div className='user-data-content'>
                    {!userData.address ? (
                        <div className='connect-wallet-section'>
                            <p>Connect your wallet to view dashboard</p>
                        </div>
                    ) : (
                        <>
                            <div className='wallet-actions'>
                                <button 
                                    onClick={refreshUserData}
                                    disabled={loading}
                                    className='refresh-button'
                                >
                                    {loading ? "Loading..." : "Refresh Data"}
                                </button>
                            </div>

                            {error && (
                                <div className='error-message'>
                                    {error}
                                </div>
                            )}

                            <div className='user-data-grid'>
                                <div className='data-item'>
                                    <span className='data-label'>Wallet Address:</span>
                                    <span className='data-value'>{formatAddress(userData.address)}</span>
                                </div>
                                <div className='user-data-sections'>                                
                                    <div className='user-internal-data'>                                
                                        <div className='data-item'>
                                            <span className='data-label'>ETH Balance:</span>
                                            <span className='data-value'>{formatEther(userData.ethBalance)} ETH</span>
                                        </div>

                                        <div className='data-item'>
                                            <span className='data-label'>WETH Balance:</span>
                                            <span className='data-value'>{formatEther(userData.wethBalance)} WETH</span>
                                        </div>

                                        <div className='data-item'>
                                            <span className='data-label'>DSC Balance:</span>
                                            <span className='data-value'>{formatEther(userData.dscBalance)} DSC</span>
                                        </div>
                                    </div>

                                    <div className='contract-data'>
                                        <div className='data-item'>
                                            <span className='data-label'>Collateral Value (USD):</span>
                                            <span className='data-value'>${formatEther(userData.totalCollateralValueInUsd)}</span>
                                        </div>

                                        <div className='data-item'>
                                            <span className='data-label'>WETH Collateral Balance:</span>
                                            <span className='data-value'>{formatEther(userData.wethCollateralBalance)} WETH</span>
                                        </div>

                                        <div className='data-item'>
                                            <span className='data-label'>Health Factor:</span>
                                            <span className={`data-value health-factor ${isHealthy(userData.healthFactor) ? 'healthy' : 'unhealthy'}`}>
                                                {formatHealthFactor(userData.healthFactor)}
                                                {isHealthy(userData.healthFactor) ? " ✓" : " ⚠️"}
                                            </span>
                                        </div>

                                        {!isHealthy(userData.healthFactor) && userData.healthFactor !== '0' && (
                                            <div className='warning-message'>
                                                ⚠️ Warning: Low health factor! Consider adding more collateral or repaying DSC.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                        </>
                    )}
                </div>
            )}
        </div>
    )
}