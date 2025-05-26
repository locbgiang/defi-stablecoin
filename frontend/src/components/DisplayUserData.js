import { useState, useEffect } from "react"; 
import { getContracts } from "../utils/ContractUtils";
import { formatEther, parseEther, Contract } from "ethers";
import './DisplayUserData.css';

export const DisplayUserData = () => {
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isExpanded, setIsExpanded] = useState(false);

    const loadUserData = async () => {
        try {
            setLoading(true);
            setError("");

            const { dsce, dsc, weth, signer } = await getContracts();
            const userAddress = await signer.getAddress();

            // Get user's balances and positions
            const [
                wethBalance,
                dscBalance,
                collateralBalance,
                healthFactor,

            ] = await Promise.all([
                weth.balanceOf(userAddress),
                dsc.balanceOf(userAddress),
                dsce.getCollateralBalanceOfUser(userAddress, weth.target),
                dsce.getHealthFactor(userAddress)
            ]);

            setUserData({
                address: userAddress,
                wethBalance: formatEther(wethBalance),
                dscBalance: formatEther(dscBalance),
                collateralBalance: formatEther(collateralBalance),
                healthFactor: healthFactor.toString(),
                isHealthy: healthFactor > 1000000000000000000n // > 1.0 in 18 decimals

            })
        } catch (err) {
            console.error("Error loading user data:", err);
            setError("Failed to load user data. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    // Auto-load data when component mounts
    useEffect(() => {
        loadUserData();
    }, []);

    const formatAddress = (address) => {
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    }

    const toggleDropdown = () => {
        setIsExpanded(!isExpanded);
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

                    <button 
                        onClick={loadUserData}
                        disabled={loading}
                        className='refresh-button'
                    >
                        {loading ? "Loading..." : "Refresh Data"}
                    </button>

                    {error && (
                        <div className='error-message'>
                            {error}
                        </div>
                    )}

                    {userData && (
                        <div className='user-data-grid'>
                            <div className='data-item'>
                                <span className='data-label'>Wallet Address:</span>
                                <span className='data-value'>{formatAddress(userData.address)}</span>
                            </div>

                            <div className='data-item'>
                                <span className='data-label'>WETH Balance:</span>
                                <span className='data-value'>{userData.wethBalance} WETH</span>
                            </div>

                            <div className='data-item'>
                                <span className='data-label'>DSC Balance:</span>
                                <span className='data-value'>{userData.dscBalance} DSC</span>
                            </div>

                            <div className='data-item'>
                                <span className='data-label'>Collateral Deposited:</span>
                                <span className='data-value'>{userData.collateralBalance} WETH</span>
                            </div>

                            <div className='data-item'>
                                <span className='data-label'>Health Factor:</span>
                                <span className={`data-value health-factor ${userData.isHealthy ? 'healthy' : 'unhealthy'}`}>
                                    {(parseFloat(userData.healthFactor) / 1e18).toFixed(4)}
                                    {userData.isHealthy ? " ✓" : " ⚠️"}
                                </span>
                            </div>

                            {!userData.isHealthy && (
                                <div className='warning-message'>
                                    ⚠️ Warning: Low health factor! Consider adding more collateral or repaying DSC.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}