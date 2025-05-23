import { useState, useEffect } from "react";
import { getContracts } from "../utils/ContractUtils";
import { parseEther, Contract } from "ethers";

export const WethConverter = () => {
    const [ethAmount, setEthAmount] = useState("");
    const [wethAmount, setWethAmount] = useState("");
    const [message, setMessage] = useState("");
    const [wethBalance, setWethBalance] = useState("");

    // Function to update WETH balance 
    const updateWethBalance = async () => {
        try {
            const { signer, weth } = await getContracts();
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
            const { signer, weth } = await getContracts();
            // const weth = new Contract(WETH_ADDRESS, WETH_ABI, signer);

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
    };

    const unwrapWeth = async () => {
        try {
            setMessage("Unwrapping WETH to ETH...");
            const { signer, weth } = await getContracts();
            // const weth = new Contract(WETH_ADDRESS, WETH_ABI, signer);

            if (!wethAmount) {
                setMessage("Please enter a WETH amount to unwrap.");
                return;
            }

            const wethAmountWei = parseEther(wethAmount);

            const balance = await weth.balanceOf(await signer.getAddress());
            if (wethAmountWei > balance) {
                setMessage(`Cannot unwrap more than your (${balance} wei`);
                return;
            }

            const unWrapTx = await weth.withdraw(wethAmountWei);
            await unWrapTx.wait();

            setMessage("Successfully unwrapped WETH to ETH");
            updateWethBalance();
        } catch (error) {
            console.error(error);
            setMessage("Error unwrapping WETH: " + (error.message));
        }
    };

    return (
        <div>
            <div>
                <h2>Converting ETH to WETH</h2>
                <p>Current WETH Balance: {wethBalance} wei</p>
                <input 
                    type="number"
                    placeholder="Enter ETH amount"
                    value={ethAmount}
                    onChange={(e) => setEthAmount(e.target.value)}
                />
                <button onClick={convertEthToWeth}>Convert</button>
                {message && <p>{message}</p>}
            </div>
            <div>
                <h2>Recovery</h2>
                <input 
                    type="number"
                    placeholder="Enter WETH amount"
                    value={wethAmount}
                    onChange={(e) => setWethAmount(e.target.value)}
                />
                <button onClick={unwrapWeth}>Recover ETH (Unwrap WETH)</button>
            </div>
        </div>
    )
}