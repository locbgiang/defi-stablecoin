import React, { useState } from "react";
import { getContracts } from "../utils/ContractUtils";
import { parseEther, id } from "ethers";
import { useUser } from '../Context';
import './RedeemCollateralForDsc.css';

export const RedeemCollateralForDsc = () => {
    const { userData, contracts, refreshUserData } = useUser();
    const [collateralAmount, setCollateralAmount] = useState("");
    const [dscToBurnAmount, setDscToBurnAmount] = useState("");
    const [message, setMessage] = useState("");
    const [isExpanded, setIsExpanded] = useState(false);

    const burnDsc = async () => {
        try {
            const dscAmountWei = parseEther(dscToBurnAmount);
            // approve the dsc engine to burn user dsc
            setMessage('Approving DSCE to burn DSC...');
            const approveTx = await contracts.dsc.approve(
                contracts.dsce.getAddress(),
                dscAmountWei
            );
            await approveTx.wait();

            // burning dsc
            setMessage('Burning DSC...');
            const burnTx = await contracts.dsce.burnDsc(
                dscAmountWei
            );
            await burnTx.wait();

            refreshUserData();
            setMessage('DSC burned successfully!');
        } catch (error) {
            console.error('Error burning DSC:', error);
            setMessage('Error burning DSC');
        }
    }

    const redeemCollateral = async () => {
        try  {
            const collateralAmountWei = parseEther(collateralAmount);

            const redeemTx = await contracts.dsce.redeemCollateral(
                contracts.weth.target,
                collateralAmountWei
            );
            await redeemTx.wait();

            refreshUserData();
        } catch (error) {
            console.error('Error redeeming collateral:', error);
            setMessage('Error redeeming collateral');
        }
    }

    const redeemAllCollateralForDsc = async () => {
        try {
            const wethCollateralAmount = userData.wethCollateralBalance;
            const dscBalanceToBurn = userData.dscBalance;

            if ( dscBalanceToBurn > 0 ) {
                // approve dsc engine to spend user dsc
                setMessage('Approving DSCE to burn DSC...');
                const approveTx = await contracts.dsc.approve(
                    contracts.dsce.getAddress(),
                    dscBalanceToBurn
                );
                await approveTx.wait();
            
                // Withdrawing all collateral
                setMessage('Withdrawing all collateral...');
                const withdrawTx = await contracts.dsce.redeemCollateralForDsc(
                    contracts.weth.target,
                    wethCollateralAmount,
                    dscBalanceToBurn
                )
                await withdrawTx.wait();
            } else {
                setMessage('No DSC to burn, withdrawing coll')
                const withdrawTx = await contracts.dsce.redeemCollateral(
                    contracts.weth.target,
                    wethCollateralAmount
                );
                await withdrawTx.wait();
            }
            setMessage('Redeemed all collateral for DSC successfully!');
            refreshUserData();
        } catch (error) {
            console.error('Error withdrawing all collateral:', error);
            if (error.message.includes('BreaksHealthFactor')) {
                setMessage('Error: Cannot withdraw all collateral, would break health factor. You may need to burn some DSC first.')
            } else {
                setMessage('Error in contract call: ' + (error.message || 'withdraw all failed'));
            }
        }
    }

    const getMessageClass = () => {
        if (message.includes('Error')) return 'error';
        if (message.includes('Approving') || message.includes('Burning') || message.includes('Withdrawing')) return 'processing';
        return 'success';
    };

    return (
        <div className="redeem-container">
            <div className="redeem-header" onClick={() => setIsExpanded(!isExpanded)}>
                <h1 className="redeem-title">
                    Redeem Collateral & Burn DSC
                    <span className={`dropdown-arrow ${isExpanded ? 'expanded' : ''}`}>▼</span>
                </h1>
            </div>
            
            {isExpanded && (
                <div className="redeem-content">
                    <div className="redeem-sections">
                        <div className="redeem-sections-row">
                            <div className="redeem-section flex-item">
                                <h2>Burning DSC</h2>
                                <div className="input-group">
                                    <div className="input-wrapper">
                                        <input 
                                            className="redeem-input"
                                            type='text'
                                            placeholder='Amount of DSC to burn'
                                            value={dscToBurnAmount}
                                            onChange={(e) => setDscToBurnAmount(e.target.value)}
                                        />
                                    </div>
                                    <button
                                        className="redeem-button"
                                        onClick={burnDsc}
                                    >
                                        Burn DSC
                                    </button>
                                </div>
                            </div>

                            <div className="redeem-section flex-item">
                                <h2>Redeeming Collateral</h2>
                                <div className="input-group">
                                    <div className="input-wrapper">
                                        <input 
                                            className="redeem-input"
                                            type='text'
                                            placeholder='Amount of collateral to redeem'
                                            value={collateralAmount}
                                            onChange={(e) => setCollateralAmount(e.target.value)}
                                        />
                                    </div>
                                    <button
                                        className="redeem-button"
                                        onClick={redeemCollateral}
                                    >
                                        Redeem Collateral
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="redeem-section redeem-all-section">
                            <h3> Burn all DSC and Redeem All Collateral</h3>
                            <button 
                                className="redeem-all-button"
                                onClick={redeemAllCollateralForDsc}
                            >
                                Redeem All
                            </button>
                            <p className="warning-text">⚠️ This will withdraw all your collateral. Make sure you have no DSC minted or this will fail.</p>
                        </div>
                    </div>

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