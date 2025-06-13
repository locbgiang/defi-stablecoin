/* global BigInt */
import { useState, useEffect } from "react";
import { getContracts } from "../utils/ContractUtils";
import { parseEther, Contract, formatEther } from "ethers";
import { useUser } from '../contexts/Context';
import './DepositCollateralAndMintDsc.css';

export const DepositCollateralAndMintDsc = () => {
    const { userData, refreshUserData, contracts } = useUser(); 
    
    // Separate state for each section
    const [depositWethAmount, setDepositWethAmount] = useState("");
    const [mintDscAmount, setMintDscAmount] = useState("");
    const [combinedWethAmount, setCombinedWethAmount] = useState("");
    const [estimatedDscAmount, setEstimatedDscAmount] = useState(0);
    
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    // Helper function to get message class
    const getMessageClass = () => {
        if (message.includes('Success') || message.includes('Successful')) {
            return 'status-message success';
        }
        if (message.includes('Error') || message.includes('Not enough')) {
            return 'status-message error';
        }
        return 'status-message processing';
    }

    // Calculate DSC amount using actual WETH price from contract
    const calculateDscAmount = async (wethAmount) => {
        try {
            //if (!wethAmount || !contracts) return 0;
            
            const wethAmountWei = parseEther(wethAmount);
            const collateralValueInUsd = await contracts.dsce.getUsdValue(
                contracts.weth.target,
                wethAmountWei
            );

            // Calculate 50% of the USD value for DSC minting
            const dscAmount = collateralValueInUsd * BigInt(50) / BigInt(100);
            return Number(formatEther(dscAmount));
        } catch (error) {
            console.error('Error calculating DSC amount:', error);
            return 0;
        }
    };

    // Update estimated DSC amount when combinedWethAmount changes
    useEffect(() => {
        const updateEstimation = async () => {
            if (combinedWethAmount && contracts) {
                const estimated = await calculateDscAmount(combinedWethAmount);
                setEstimatedDscAmount(estimated);
            } else {
                setEstimatedDscAmount(0);
            }
        };

        updateEstimation();
    }, [combinedWethAmount, contracts]);

    // Individual deposit collateral function
    const depositCollateral = async () => {
        try {
            setIsLoading(true);
            setMessage("Processing deposit collateral...");
            
            const wethAmountWei = parseEther(depositWethAmount);

            setMessage("Approving WETH for DSCEngine...");
            const approveTx = await contracts.weth.approve(
                await contracts.dsce.getAddress(),
                wethAmountWei
            );
            await approveTx.wait();

            setMessage("Depositing collateral...");
            const depositTx = await contracts.dsce.depositCollateral(
                contracts.weth.target,
                wethAmountWei
            );
            await depositTx.wait();

            setDepositWethAmount("");
            refreshUserData();
            setMessage("Success! Collateral deposited.");
        } catch (err) {
            console.error(err);
            setMessage("Error: " + (err.message));
        } finally {
            setIsLoading(false);
        }
    }

    // Individual mint DSC function
    const mintDsc = async () => {
        try {
            setIsLoading(true);
            setMessage("Processing mint DSC...");
            
            const dscAmountWei = parseEther(mintDscAmount);

            setMessage("Minting DSC...");
            const mintTx = await contracts.dsce.mintDsc(dscAmountWei);
            await mintTx.wait();

            setMintDscAmount("");
            refreshUserData();
            setMessage("Success! DSC minted.");
        } catch (err) {
            console.error(err);
            setMessage("Error: " + (err.message));
        } finally {
            setIsLoading(false);
        }
    }

    // Combined deposit and mint (automatic 50%)
    const depositCollateralAndMintDsc = async () => {
        try {
            setIsLoading(true);
            setMessage("Processing deposit and mint...");

            const wethAmountWei = parseEther(combinedWethAmount);
            
            // Calculate 50% DSC amount automatically using actual price
            const dscAmount = await calculateDscAmount(combinedWethAmount);
            const dscAmountWei = parseEther(dscAmount.toString());

            setMessage("Approving WETH for DSCEngine...");
            const approveTx = await contracts.weth.approve(
                await contracts.dsce.getAddress(), 
                wethAmountWei
            );
            await approveTx.wait();

            setMessage("Depositing collateral...");
            const depositTx = await contracts.dsce.depositCollateral(
                contracts.weth.target,
                wethAmountWei
            );
            await depositTx.wait();

            setMessage("Minting DSC (50% of collateral value)...");
            const mintTx = await contracts.dsce.mintDsc(dscAmountWei);
            await mintTx.wait();
            
            setCombinedWethAmount("");
            refreshUserData();
            setMessage(`Success! Deposited ${combinedWethAmount} WETH and minted ${dscAmount.toFixed(2)} DSC.`);
            
        } catch (error) {
            console.error(error);
            setMessage("Error: " + (error.message || "Something went wrong"));
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className='deposit-mint-container'>
            <div 
                className='deposit-mint-header'
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <h2 className='deposit-mint-title'>
                    Deposit Collateral and Mint DSC
                    <span className={`dropdown-arrow ${isExpanded ? 'expanded' : ''}`}>
                        ▼
                    </span>
                </h2>
            </div>
            {isExpanded && (
                <div className='deposit-mint-content'>
                    <div className='deposit-mint-sections'>
                        {/* Horizontal sections for deposit and mint */}
                        <div className='horizontal-sections'>
                            <div className='input-section'>
                                <h3> Deposit Collateral </h3>
                                <div className='input-group'>
                                    <input 
                                        className='deposit-input'
                                        type="number"
                                        placeholder="Enter WETH amount to deposit"
                                        value={depositWethAmount}
                                        onChange={(e) => setDepositWethAmount(e.target.value)}
                                        disabled={isLoading}
                                    />
                                    <button
                                        className='individual-action-button deposit-button'
                                        onClick={depositCollateral}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? "Processing..." : "Deposit Collateral"}
                                    </button>
                                    <p className='section-description'>
                                        Deposit WETH as collateral
                                    </p>
                                </div>
                            </div>

                            <div className='input-section'>
                                <h3> Mint DSC </h3>
                                <div className='input-group'>
                                    <input 
                                        className='deposit-input'
                                        type="number"
                                        placeholder="Enter DSC amount to mint"
                                        value={mintDscAmount}
                                        onChange={(e) => setMintDscAmount(e.target.value)}
                                        disabled={isLoading}
                                    />
                                    <button
                                        className='individual-action-button mint-button'
                                        onClick={mintDsc}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? "Processing..." : "Mint DSC"}
                                    </button>
                                    <p className='section-description'>
                                        Mint DSC using existing collateral
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Combined section at the bottom */}
                        <div className='input-section combined-section'>
                            <h3> Deposit and Mint</h3>
                            <div className='input-group'>
                                <input 
                                    className='deposit-input'
                                    type="number"
                                    placeholder="Enter WETH amount"
                                    value={combinedWethAmount}
                                    onChange={(e) => setCombinedWethAmount(e.target.value)}
                                    disabled={isLoading}
                                />
                                <div className='auto-calculation-display'>
                                    {combinedWethAmount && (
                                        <span className='calculation-text'>
                                            Will mint: ~{estimatedDscAmount.toFixed(2)} DSC
                                            <small>(50% of collateral value)</small>
                                        </span>
                                    )}
                                </div>
                                <button
                                    className='main-action-button'
                                    onClick={depositCollateralAndMintDsc}
                                    disabled={isLoading}
                                >
                                    {isLoading && <span className="loading-spinner"></span>}
                                    {isLoading ? "Processing..." : "Deposit & Mint (50%)"}
                                </button>
                                <p className='section-description combined-description'>
                                    Automatically deposits WETH and mints DSC at 50% collateral ratio
                                </p>
                            </div>
                        </div>
                    </div>

                    {message && (
                        <div className={getMessageClass()}>
                            {message}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};