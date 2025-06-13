import { useState, useEffect } from 'react';
import { useUser } from '../contexts/Context';
import { parseEther, formatEther } from 'ethers';
import './Liquidation.css';


export const Liquidation = () => {
    const { userData, refreshUserData, contracts } = useUser();
    
    // State for liquidation form
    const [targetUser, setTargetUser] = useState("");
    const [debtToCover, setDebtToCover] = useState("");
    const [collateralToken, setCollateralToken] = useState("");
    const [message, setMessage] = useState("");
    const [isExpanded, setIsExpanded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    // State for displaying liquidatable positions
    const [liquidatablePositions, setLiquidatablePositions] = useState([]);
    const [searchResults, setSearchResults] = useState(null);
    
    // Available collateral tokens (you might want to get this from your contract)
    const [availableTokens, setAvailableTokens] = useState([]);

    useEffect(() => {
        if (contracts) {
            loadAvailableTokens();
        }
    }, [contracts]);

    const loadAvailableTokens = async () => {
        try {
            const tokens = await contracts.dsce.getCollateralTokens();
            setAvailableTokens(tokens);
            if (tokens.length > 0) {
                setCollateralToken(tokens[0]); // Default to first token (WETH)
            }
        } catch (error) {
            console.error('Error loading tokens:', error);
        }
    };

    // Check if a specific user can be liquidated
    const checkUserLiquidation = async () => {
        if (!targetUser || !contracts) return;
        
        try {
            setIsLoading(true);
            setMessage("Checking user health factor...");
            
            const healthFactor = await contracts.dsce.getHealthFactor(targetUser);
            const minHealthFactor = await contracts.dsce.getMinHealthFactor();
            const accountInfo = await contracts.dsce.getAccountInformation(targetUser);
            
            const isLiquidatable = healthFactor < minHealthFactor;
            
            setSearchResults({
                address: targetUser,
                healthFactor: healthFactor.toString(),
                isLiquidatable,
                totalDscMinted: accountInfo[0].toString(),
                collateralValue: accountInfo[1].toString()
            });
            
            setMessage(isLiquidatable ? 
                "User can be liquidated!" : 
                "User has healthy position"
            );
        } catch (error) {
            console.error('Error checking user:', error);
            setMessage("Error checking user: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Perform liquidation
    const performLiquidation = async () => {
        if (!targetUser || !debtToCover || !collateralToken || !contracts) {
            setMessage("Please fill all fields");
            return;
        }
        
        try {
            setIsLoading(true);
            setMessage("Preparing liquidation...");
            
            const debtAmount = parseEther(debtToCover);
            
            // First approve DSC spending
            setMessage("Approving DSC for liquidation...");
            const approveTx = await contracts.dsc.approve(
                await contracts.dsce.getAddress(),
                debtAmount
            );
            await approveTx.wait();
            
            // Perform liquidation
            setMessage("Executing liquidation...");
            const liquidateTx = await contracts.dsce.liquidate(
                collateralToken,
                targetUser,
                debtAmount
            );
            await liquidateTx.wait();
            
            setMessage("Liquidation successful!");
            refreshUserData();
            
            // Clear form
            setTargetUser("");
            setDebtToCover("");
            
            // Recheck the user
            setTimeout(checkUserLiquidation, 2000);
            
        } catch (error) {
            console.error('Liquidation error:', error);
            if (error.message.includes('HealthFactorOk')) {
                setMessage("Error: User has healthy position and cannot be liquidated");
            } else if (error.message.includes('InsufficientBalance')) {
                setMessage("Error: Insufficient DSC balance for liquidation");
            } else {
                setMessage("Liquidation failed: " + (error.message || "Unknown error"));
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Calculate liquidation preview
    const calculateLiquidationReward = async () => {
        if (!debtToCover || !collateralToken || !contracts) return null;
        
        try {
            const debtAmount = parseEther(debtToCover);
            const tokenAmount = await contracts.dsce.getTokenAmountFromUsd(collateralToken, debtAmount);
            const liquidationBonus = await contracts.dsce.getLiquidationBonus();
            const liquidationPrecision = await contracts.dsce.getLiquidationPrecision();
            
            const bonusAmount = (tokenAmount * liquidationBonus) / liquidationPrecision;
            const totalReward = tokenAmount + bonusAmount;
            
            return {
                baseAmount: formatEther(tokenAmount),
                bonusAmount: formatEther(bonusAmount),
                totalReward: formatEther(totalReward)
            };
        } catch (error) {
            console.error('Error calculating reward:', error);
            return null;
        }
    };

    const [liquidationPreview, setLiquidationPreview] = useState(null);

    useEffect(() => {
        const updatePreview = async () => {
            const preview = await calculateLiquidationReward();
            setLiquidationPreview(preview);
        };
        
        if (debtToCover && collateralToken) {
            updatePreview();
        } else {
            setLiquidationPreview(null);
        }
    }, [debtToCover, collateralToken, contracts]);

    const formatHealthFactor = (hf) => {
        if (hf === '0') return '0.00';
        const factor = Number(formatEther(hf));
        return factor > 1000000 ? '∞' : factor.toFixed(3);
    };

    const getMessageClass = () => {
        if (message.includes('Error') || message.includes('failed')) return 'error';
        if (message.includes('successful') || message.includes('can be liquidated')) return 'success';
        return 'processing';
    };

    return (
        <div className="liquidation-container">
            <div className="liquidation-header" onClick={() => setIsExpanded(!isExpanded)}>
                <h1 className="liquidation-title">
                    Liquidation Interface
                    <span className={`dropdown-arrow ${isExpanded ? 'expanded' : ''}`}>▼</span>
                </h1>
            </div>
            
            {isExpanded && (
                <div className="liquidation-content">
                    {/* User Search Section */}
                    <div className="liquidation-section">
                        <h2>Check User Position</h2>
                        <div className="input-group">
                            <input
                                className="liquidation-input"
                                type="text"
                                placeholder="Enter user address to check"
                                value={targetUser}
                                onChange={(e) => setTargetUser(e.target.value)}
                                disabled={isLoading}
                            />
                            <button
                                className="liquidation-button check-button"
                                onClick={checkUserLiquidation}
                                disabled={isLoading || !targetUser}
                            >
                                Check Position
                            </button>
                        </div>
                        
                        {searchResults && (
                            <div className={`position-info ${searchResults.isLiquidatable ? 'liquidatable' : 'healthy'}`}>
                                <h3>Position Details</h3>
                                <div className="position-details">
                                    <div className="detail-item">
                                        <span>Health Factor:</span>
                                        <span className={`health-factor ${searchResults.isLiquidatable ? 'unhealthy' : 'healthy'}`}>
                                            {formatHealthFactor(searchResults.healthFactor)}
                                        </span>
                                    </div>
                                    <div className="detail-item">
                                        <span>DSC Minted:</span>
                                        <span>{formatEther(searchResults.totalDscMinted)} DSC</span>
                                    </div>
                                    <div className="detail-item">
                                        <span>Collateral Value:</span>
                                        <span>${formatEther(searchResults.collateralValue)}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span>Status:</span>
                                        <span className={searchResults.isLiquidatable ? 'status-liquidatable' : 'status-safe'}>
                                            {searchResults.isLiquidatable ? '⚠️ LIQUIDATABLE' : '✅ SAFE'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Liquidation Form */}
                    {searchResults?.isLiquidatable && (
                        <div className="liquidation-section liquidation-form">
                            <h2>Perform Liquidation</h2>
                            <div className="form-grid">
                                <div className="input-group">
                                    <label>Collateral Token</label>
                                    <select
                                        className="liquidation-select"
                                        value={collateralToken}
                                        onChange={(e) => setCollateralToken(e.target.value)}
                                        disabled={isLoading}
                                    >
                                        {availableTokens.map((token) => (
                                            <option key={token} value={token}>
                                                {token === contracts?.weth?.target ? 'WETH' : token}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div className="input-group">
                                    <label>Debt to Cover (DSC)</label>
                                    <input
                                        className="liquidation-input"
                                        type="number"
                                        placeholder="Amount of DSC debt to cover"
                                        value={debtToCover}
                                        onChange={(e) => setDebtToCover(e.target.value)}
                                        disabled={isLoading}
                                        max={formatEther(searchResults.totalDscMinted)}
                                    />
                                    <small>Max: {formatEther(searchResults.totalDscMinted)} DSC</small>
                                </div>
                            </div>

                            {/* Liquidation Preview */}
                            {liquidationPreview && (
                                <div className="liquidation-preview">
                                    <h3>Liquidation Reward Preview</h3>
                                    <div className="preview-details">
                                        <div className="preview-item">
                                            <span>Base Collateral:</span>
                                            <span>{liquidationPreview.baseAmount} tokens</span>
                                        </div>
                                        <div className="preview-item">
                                            <span>Liquidation Bonus (10%):</span>
                                            <span>{liquidationPreview.bonusAmount} tokens</span>
                                        </div>
                                        <div className="preview-item total">
                                            <span>Total Reward:</span>
                                            <span>{liquidationPreview.totalReward} tokens</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <button
                                className="liquidation-button liquidate-button"
                                onClick={performLiquidation}
                                disabled={isLoading || !debtToCover || !targetUser}
                            >
                                {isLoading ? "Processing..." : "Liquidate Position"}
                            </button>
                        </div>
                    )}

                    {/* Status Messages */}
                    {message && (
                        <div className={`status-message ${getMessageClass()}`}>
                            {message}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};