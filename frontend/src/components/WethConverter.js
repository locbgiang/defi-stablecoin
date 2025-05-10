import { useState, useEffect } from "react";
import { getContracts } from "../utils/ContractUtils";
import { parseEther, Contract } from "ethers";

// WETH contract address on sepolia
const WETH_ADDRESS = "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9";

// Minimal WETH ABI for the functions we need
const WETH_ABI = [
    "function deposit() external payable",
    "function approve(address spender, uint256 amount) external returns (bool)"
];

export const WethConverter = () => {
    const [ethAmount, setEthAmount] = useState("");
    const [message, setMessage] = useState("");
    const [wethBalance, setWethBalance] = useState("");

    // Function to update WETH balance 
    const updateWethBalance = async () => {
        try {
            const { signer } = await getContracts();
            const weth = new Contract(WETH_ADDRESS, WETH_ABI, signer);
            const balance = await weth.balanceOf(await signer.getAddress());
            setWethBalance(balance.toString());
        } catch (error) {
            console.error("Error: fetching WETH balance:", error);
        }
    };

    // Update balance on component mount
    useEffect(() => {
        updateWethBalance();
    }, []);

    const convertEthToWeth = async () => {
        try {
            setMessage("Processing ETH to WETH conversion...");
            const { signer } = await getContracts();
            const weth = new Contract(WETH_ADDRESS, WETH_ABI, signer);

            const ethAmountWei = parseEther(ethAmount);
            const wrapTx = await weth.deposit({
                value: ethAmountWei,
            });
            setMessage("Wrapping ETH to WETH...");
            await wrapTx.wait();

            setMessage("Successfully converted ETH to WETH.");
            updateWethBalance();
        } catch (error) {
            console.error(error);
            setMessage("Error converting ETH: " + (error.message));
        }
    }

    return (
        <div>
            <h2>Converting ETH to WETH</h2>
            <input 
                type="number"
                placeholder="Enter ETH amount"
                value={ethAmount}
                onChange={(e) => setEthAmount(e.target.value)}
            />
            <button onClick={convertEthToWeth}>Convert</button>
            {message && <p>{message}</p>}
        </div>
    )
}