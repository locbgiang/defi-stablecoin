import { useState, useEffect } from "react";
import { getContracts } from "../utils/ContractUtils";
import { parseEther, Contract, formatEther } from "ethers";
import './WethConverter.css';

export const WethConverter = () => { 
    const [ethAmount, setEthAmount] = useState("");
    const [wethAmount, setWethAmount] = useState("");
    const [message, setMessage] = useState("");
    const [wethBalance, setWethBalance] = useState("");

    const convertEthToWeth = async () => {
        try {
            setMessage("Processing ETH to WETH conversion...");
            const { signer, weth } = await getContracts();

            const ethAmountWei = parseEther(ethAmount);
            const wrapTx = await weth.deposit({
                value: ethAmountWei,
            });
            setMessage("Wrapping ETH to WETH...");
            await wrapTx.wait();

            setMessage("Successfully converted ETH to WETH.");
        } catch (error) {
            console.error(error);
            setMessage("Error converting ETH: " + (error.message));
        }
    };

    const unwrapWeth = async () => {
        try {
            setMessage("Unwrapping WETH to ETH...");
            const { signer, weth } = await getContracts();

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