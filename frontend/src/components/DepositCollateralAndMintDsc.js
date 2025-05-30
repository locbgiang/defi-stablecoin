/* global BigInt */
import { useState, useEffect } from "react";
import { getContracts } from "../utils/ContractUtils";
import { parseEther, Contract } from "ethers";
import './DepositCollateralAndMintDsc.css'; // Assuming you have a CSS file for styles

export const DepositCollateralAndMintDsc = () => {
    const [wethAmount, setWethAmount] = useState("");
    const [dscAmount, setDscAmount] = useState("");
    const [message, setMessage] = useState("");
    const [wethBalance, setWethBalance] = useState("");
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

    // fetch WETH balance on component mount
    const updateWethBalance = async () => {
        try {
            const { signer, weth } = await getContracts();
            // const weth = new Contract(WETH_ADDRESS, WETH_ABI, signer);
            const balance = await weth.balanceOf(await signer.getAddress());
            setWethBalance(balance.toString());
        } catch (error) {
            console.error("Error fetching WETH balance:", error);
        }
    };

    useEffect(() => {
        updateWethBalance();
    }, []);

    // Calculate safe DSC amount based on collateral (45% of collateral value)
    const calculateSafeDscAmount = () => {
        if (!wethAmount) return "";
        // Default to 45% of collateral value 
        const safeAmount = (parseFloat(wethAmount) * 0.45).toFixed(18);
        setDscAmount(safeAmount);
    };

    const handleDepositAndMint = async () => {
        try {
            setIsLoading(true);
            setMessage("Processing deposit and mint...");

            // input validation
            if (!wethAmount || parseFloat(wethAmount) <= 0) {
                setMessage("Please enter a valid WETH amount.");
                setIsLoading(false);
                return;
            }

            if (!dscAmount || parseFloat(dscAmount) <= 0) {
                setMessage("Please Enter a valid DSC amount.");
                setIsLoading(false);
                return;
            }

            const { dsce, signer, weth } = await getContracts();
            // const weth = new Contract(WETH_ADDRESS, WETH_ABI, signer);

            // convert amounts to wei
            const wethAmountWei = parseEther(wethAmount);
            const dscAmountWei = parseEther(dscAmount);

            // check if user has enough WETH
            const wethBalanceBN = BigInt(wethBalance);
            if (wethAmountWei > wethBalanceBN) {
                setMessage(`Not enough WETH. You have ${wethBalance} wei, but trying to deposit ${wethAmountWei.toString()} wei`);
                setIsLoading(false);
                return;
            }

            // 1. approve dscengine to spend weth
            setMessage("Approving WETH for DSCEngine...");
            console.log("WETH amount (wei):", wethAmountWei.toString());
            console.log("DSC amount (wei):", dscAmountWei.toString());

            // approval transaction
            const approveTx = await weth.approve(await dsce.getAddress(), wethAmountWei);
            await approveTx.wait();
            setMessage("Approval successful. Now depositing collateral and minting DSC...");

            try {
                /*
                const mintTx = await dsce.depositCollateralAndMintDsc(
                    WETH_ADDRESS,
                    wethAmountWei,
                    dscAmountWei
                );
                await mintTx.wait();
                */
                
                // instead of depositCollateralAndMintDsc
                // deposit collateral and mint DSC separately
                setMessage("Depositing collateral...");
                const depositTx = await dsce.depositCollateral(
                    weth.target,
                    wethAmountWei
                );
                await depositTx.wait();

                setMessage("Minting DSC...");
                const mintTx = await dsce.mintDsc(
                    dscAmountWei
                );
                await mintTx.wait();
                
                setMessage("Success! Deposited WETH and minted DSC.");

                // clear inputs after successful transaction
                setWethAmount("");
                setDscAmount("");

                // update WETH balance
                updateWethBalance();
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
                    <div className='input-section'>
                        <h3>WETH Collateral Amount</h3>
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

                    <div className='input-section'>
                        <h3>DSC Amount to Mint</h3>
                        <div className='input-group'>
                            <div className='input-wrapper'>
                                <input 
                                    className='deposit-input'
                                    type="number"
                                    placeholder="Enter DSC amount (45% of collateral recommended"
                                    value={dscAmount}
                                    onChange={(e) => setDscAmount(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>
                            <button 
                                className='calculate-button'
                                onClick={calculateSafeDscAmount}
                                disabled={isLoading || !wethAmount}
                            >
                                Safe Amount
                            </button>
                        </div>
                        <div className='recommendation-text'>
                            Recommended: 45% of collateral value for safe minting
                        </div>
                    </div>

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
            )}
        </div>
    );
};