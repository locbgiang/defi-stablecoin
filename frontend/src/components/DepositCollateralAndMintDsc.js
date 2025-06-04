/* global BigInt */
import { useState, useEffect } from "react";
import { getContracts } from "../utils/ContractUtils";
import { parseEther, Contract } from "ethers";
import { useUser } from '../Context';
import './DepositCollateralAndMintDsc.css'; // Assuming you have a CSS file for styles

export const DepositCollateralAndMintDsc = () => {
    const { userData, refreshUserData, contracts } = useUser(); 
    const [wethAmount, setWethAmount] = useState("");
    const [dscAmount, setDscAmount] = useState("");
    const [message, setMessage] = useState("");
    //const [wethBalance, setWethBalance] = useState("");
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

    // Format balance for display
    const formatBalance = (balance) => {
        if (!balance) return '0 WETH';
        const balanceInEth = parseFloat(balance) / 1e18;
        return `${balanceInEth.toFixed(6)} WETH`;
    }

    // Calculate safe DSC amount based on collateral (45% of collateral value)
    const calculateSafeDscAmount = async () => {
        try {
            // Convert WETH amount to wei
            const wethAmountWei = parseEther(wethAmount);

            // Get USD value of the WETH collateral
            const collateralValueInUsd = await contracts.dsce.getUsdValue(
                contracts.weth.target,
                wethAmountWei
            );

            // Calculate 45% of the USD value for safe DSC minting
            // Since DSC is pegged to $1, we can mint up to 45% of collateral USD value
            const safeUsdAmount = collateralValueInUsd * BigInt(45) / BigInt(100);

            // Convert back to ether uints for display (DSC has 18 decimals like eth)
            const safeDscAmount = Number(safeUsdAmount) / 1e18;

            setDscAmount(safeDscAmount.toFixed(2));
        } catch (error) {
            console.error('Error calculating safe DSC amount:', error)
            setMessage('Error calculating safe DSC amount. Please check your WETH input.');
        }
    };

    const handleDepositAndMint = async () => {
        try {
            setMessage("Processing deposit and mint...");

            // const weth = new Contract(WETH_ADDRESS, WETH_ABI, signer);

            // convert amounts to wei
            const wethAmountWei = parseEther(wethAmount);
            const dscAmountWei = parseEther(dscAmount);

            // 1. approve dscengine to spend weth
            setMessage("Approving WETH for DSCEngine...");
            console.log("WETH amount (wei):", wethAmountWei.toString());
            console.log("DSC amount (wei):", dscAmountWei.toString());

            // approval transaction
            const approveTx = await contracts.weth.approve(await contracts.dsce.getAddress(), wethAmountWei);
            await approveTx.wait();
            setMessage("Approval successful. Now depositing collateral and minting DSC...");

            try {
                setMessage("Depositing collateral...");
                const depositTx = await contracts.dsce.depositCollateral(
                    contracts.weth.target,
                    wethAmountWei
                );
                await depositTx.wait();

                setMessage("Minting DSC...");
                const mintTx = await contracts.dsce.mintDsc(
                    dscAmountWei
                );
                await mintTx.wait();
                
                setMessage("Success! Deposited WETH and minted DSC.");

                // clear inputs after successful transaction
                setWethAmount("");
                setDscAmount("");

                refreshUserData(); // Refresh user data to update balances
            } catch (error) {
                console.error("Contract error:", error);
                setMessage("Error in contract call: " + (error.message || "Transaction failed"));
            }
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
                        <div className='input-section'>
                            <h3>WETH Collateral</h3>
                            <div className='input-group'>
                                <input 
                                    className='deposit-input'
                                    type="number"
                                    placeholder="Enter WETH amount"
                                    value={wethAmount}
                                    onChange={(e) => setWethAmount(e.target.value)}
                                    onBlur={calculateSafeDscAmount}
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <div className='input-section'>
                            <h3>DSC to Mint</h3>
                            <div className='input-group'>
                                <input 
                                    className='deposit-input'
                                    type="number"
                                    placeholder="Enter DSC amount"
                                    value={dscAmount}
                                    onChange={(e) => setDscAmount(e.target.value)}
                                    disabled={isLoading}
                                />
                                <button 
                                    className='calculate-button'
                                    onClick={calculateSafeDscAmount}
                                    disabled={isLoading || !wethAmount}
                                >
                                    Calculate Safe Amount (45%)
                                </button>
                                <div className='recommendation-text'>
                                    Recommended: 45% of collateral value
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className='action-section'>
                        <button
                            className='main-action-button'
                            onClick={handleDepositAndMint}
                            disabled={isLoading || !wethAmount || !dscAmount}
                        >
                            {isLoading && <span className="loading-spinner"></span>}
                            {isLoading ? "Processing..." : "Deposit Collateral and Mint DSC"}
                        </button>
                        
                        {message && (
                            <div className={getMessageClass()}>
                                {message}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};