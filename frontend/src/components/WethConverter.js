import { useState, useEffect } from "react";
import { getContracts } from "../utils/ContractUtils";
import { parseEther, Contract, formatEther } from "ethers";
import './WethConverter.css';

export const WethConverter = () => { 
    const [ethAmount, setEthAmount] = useState("");
    const [wethAmount, setWethAmount] = useState("");
    const [message, setMessage] = useState("");

    const convertEthToWeth = async () => {
        try {
            setMessage("Processing ETH to WETH conversion...");
            const { weth } = await getContracts();
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
            setMessage("Processing WETH to ETH conversion...");
            const { weth } = await getContracts();
            const wethAmountWei = parseEther(wethAmount);
            const unWrapTx = await weth.withdraw(wethAmountWei);

            setMessage("Unwrapping WETH to ETH...");
            await unWrapTx.wait();

            setMessage("Successfully unwrapped WETH to ETH");
        } catch (error) {
            console.error(error);
            setMessage("Error unwrapping WETH: " + (error.message));
        }
    };

    return (
        <div className='weth-converter-container'>
            <div className='converter-section'>
                <h2>Converting ETH to WETH</h2>
                <div className='input-group'>        
                    <input 
                        className='converter-input'
                        type="number"
                        placeholder="Enter ETH amount"
                        value={ethAmount}
                        onChange={(e) => setEthAmount(e.target.value)}
                    />
                    <button className='converter-button' onClick={convertEthToWeth}>
                        Convert ETH to WETH
                    </button>
                </div>
                {message && <p>{message}</p>}
            </div>
            <div className='converter-section'>
                <h2>Recovery</h2>
                <div className='input-group'>
                    <input 
                        className='converter-input'
                        type="number"
                        placeholder="Enter WETH amount"
                        value={wethAmount}
                        onChange={(e) => setWethAmount(e.target.value)}
                    />
                    <button className='converter-button' onClick={unwrapWeth}>
                        Recover ETH (Unwrap WETH)
                    </button>
                </div>
            </div>
        </div>
    )
}