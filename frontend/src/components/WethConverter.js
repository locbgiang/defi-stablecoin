import { useState, useEffect } from "react";
import { getContracts } from "../utils/ContractUtils";
import { parseEther, Contract, formatEther } from "ethers";
import { useUser } from "../Context";
import './WethConverter.css';

export const WethConverter = () => { 
    const {userData,refreshUserData, contracts} = useUser();
    const [ethAmount, setEthAmount] = useState("");
    const [wethAmount, setWethAmount] = useState("");
    const [message, setMessage] = useState("");
    const [isExpanded, setIsExpanded] = useState(false);

    const convertEthToWeth = async () => {
        try {
            setMessage("Processing ETH to WETH conversion...");
            // const { weth } = await getContracts();
            const ethAmountWei = parseEther(ethAmount);
            const wrapTx = await contracts.weth.deposit({
                value: ethAmountWei,
            });

            setMessage("Wrapping ETH to WETH...");
            await wrapTx.wait();

            refreshUserData();
            setMessage("Successfully converted ETH to WETH.");
        } catch (error) {
            console.error(error);
            setMessage("Error converting ETH: " + (error.message));
        }
    };

    const unwrapWeth = async () => {
        try {
            setMessage("Processing WETH to ETH conversion...");
            // const { weth } = await getContracts();
            const wethAmountWei = parseEther(wethAmount);
            const unWrapTx = await contracts.weth.withdraw(wethAmountWei);

            setMessage("Unwrapping WETH to ETH...");
            await unWrapTx.wait();

            refreshUserData();
            setMessage("Successfully unwrapped WETH to ETH");
        } catch (error) {
            console.error(error);
            setMessage("Error unwrapping WETH: " + (error.message));
        }
    };

    const getMessageClass = () => {
        if (message.includes('Error')) return 'status-message error';
        if (message.includes('Processing') || message.includes('Unwrapping')) {
            return 'status-message processing';
        }
        if (message.includes('sucessfully')) return 'status-message sucess';
        return 'status-message';
    }

    const toggleDropDown = () => {
        setIsExpanded(!isExpanded);
    };

    return (
        <div className='weth-converter-container'>
            <div className='weth-converter-header' onClick={toggleDropDown}>
                <h2 className='weth-converter-title'>
                    WETH Converter
                    <span className={`dropdown-arrow ${isExpanded ? 'expanded' : ''}`}>▼</span>
                </h2>
            </div>

            {isExpanded && (
                <div className='weth-converter-content'>
                    <div className='converter-sections'>
                        <div className='converter-section'>
                            <h3>Converting ETH to WETH</h3>
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
                        </div>
                        
                        <div className='converter-section'>
                            <h3>Recovery</h3>
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
                    {message && <div className={getMessageClass()}>{message}</div>}
                </div>
            )}
        </div>
    )
}