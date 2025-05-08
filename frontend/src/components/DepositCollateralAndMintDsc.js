import { useState } from "react";
import { getContracts } from "../utils/ContractUtils";
import { parseEther, Contract } from "ethers";

// WETH contract address on sepolia
const WETH_ADDRESS = "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9";

// Minimal WETH ABI for the functions we need
const WETH_ABI = [
    "function deposit() external payable",
    "function approve(address spender, uint256 amount) external returns (bool)"
];

export const DepositCollateralAndMintDsc = () => {
    const [ethAmount, setEthAmount] = useState("");
    const [dscAmount, setDscAmount] = useState("");
    const [message, setMessage] = useState("");

    const handleDepositAndMint = async () => {
        try {
            setMessage("Processing transaction...");
            const { dsce, signer } = await getContracts();

            // 1. Create WETH contract instance
            const weth = new Contract(WETH_ADDRESS, WETH_ABI, signer);

            // 2. Convert ETH to WETH
            const ethAmountWei = parseEther(ethAmount);
            const wrapTx = await weth.deposit({
                value: ethAmountWei,
            });
            setMessage("Wrapping ETH to WETH...");
            await wrapTx.wait();

            // 3. Approve DSCEngine to spend WETH
            setMessage("Approving WETH for DSCEngine...");
            const approveTx = await weth.approve(await dsce.getAddress(), ethAmountWei);
            await approveTx.wait();

            // 4. Call depositCollateralAndMintDsc with the right parameters
            setMessage("Depositing WETH and minting DSC...");
            const dscAmountWei = parseEther(dscAmount ||  ethAmount);
            const mintTx = await dsce.depositCollateralAndMintDsc(
                WETH_ADDRESS,
                ethAmountWei,
                dscAmountWei
            );

            await mintTx.wait();
            setMessage("Success! Deposited WETH and minted DSC.");
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
            <input 
                type="number"
                placeholder="Enter DSC amount to mint (optional)"
                value={dscAmount}
                onChange={(e) => setDscAmount(e.target.value)}
            />
            <button onClick={handleDepositAndMint}>Deposit & Mint</button>
            {message && <p>{message}</p>}
        </div>
    )
}