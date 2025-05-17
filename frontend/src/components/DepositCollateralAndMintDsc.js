/* global BigInt */
import { useState, useEffect } from "react";
import { getContracts } from "../utils/ContractUtils";
import { parseEther, Contract } from "ethers";

const WETH_ADDRESS = "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9";

const WETH_ABI = [
    "function balanceOf(address account) external view returns (uint256)",
    "function approve(address spender, uint256 amount) external returns (bool)",
]


export const DepositCollateralAndMintDsc = () => {
    const [wethAmount, setWethAmount] = useState("");
    const [dscAmount, setDscAmount] = useState("");
    const [message, setMessage] = useState("");
    const [wethBalance, setWethBalance] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // fetch WETH balance on component mount
    const updateWethBalance = async () => {
        try {
            const { signer } = await getContracts();
            const weth = new Contract(WETH_ADDRESS, WETH_ABI, signer);
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

            const { dsce, signer } = await getContracts();
            const weth = new Contract(WETH_ADDRESS, WETH_ABI, signer);

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
                    WETH_ADDRESS,
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
        <div>
            <h2>Deposit Collateral and Mint DSC</h2>
            <p>Current WETH Balance: {wethBalance} wei</p>

            <div>
                <label>
                    WETH Collateral Amount:
                    <input 
                        type="number"
                        placeholder="Enter WETH amount"
                        value={wethAmount}
                        onChange={(e) => setWethAmount(e.target.value)}
                        onBlur={calculateSafeDscAmount}
                    />
                </label>
            </div>
            <div>
                <label>
                    DSC Amount to Mint:
                    <input 
                        type="number"
                        placeholder="Enter DSC amount (45% of collateral recommended"
                        value={dscAmount}
                        onChange={(e) => setDscAmount(e.target.value)}
                    />
                </label>
                <button
                    onClick={calculateSafeDscAmount}
                >
                    Calculate Safe Amount
                </button>
            </div>

            <button
                onClick={handleDepositAndMint}
            >
                {isLoading ? "Processing..." : "Deposit Collateral and Mint DSC"}
            </button>

            {message && <p>{message}</p>}
        </div>
    );
};