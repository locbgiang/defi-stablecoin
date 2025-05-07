import { useState } from "react";
import { getContracts } from "../utils/ContractUtils";
import { parseEther } from "ethers";

// WETH contract address on sepolia
const WETH_ADDRESS = "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9";

// Minimal WETH ABI for the functions we need
const WETH_ABI = [
    "function deposit() external payable",
    "function approve(address spender, uint256 amount) external returns (bool)"
];

export const DepositCollateralAndMintDsc = () => {
    const [ethAmount, setEthAmount] = useState("");
    const [message, setMessage] = useState("");

    const handleDepositAndMint = async () => {
        try {
            const { dsce } = await getContracts();
            const tx = await dsce.depositCollateralAndMintDsc({
                // Convert ethAmount to wei
                value: parseEther(ethAmount),
            });
            setMessage("Transaction sent! Waiting for confirmation...");
            await tx.wait();
            setMessage("Transaction confirmed! DSC minted successfully.");    
        } catch (error) {
            console.error(error);
            setMessage("Error: " + (error.message || "Something went wrong."));
        }
    };

    return (
        <div>
            <h1>Deposit ETH and Mint DSC</h1>
            <input 
                type="number"
                placeholder="Enter ETH amount"
                value={ethAmount}
                onChange={(e) => setEthAmount(e.target.value)}
            />
            <button onClick={handleDepositAndMint}>Deposit & Mint</button>
            {message && <p>{message}</p>}
        </div>
    )
}