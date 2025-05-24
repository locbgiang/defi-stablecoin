import React, { useState } from 'react';
import { getContracts } from '../utils/ContractUtils';
import { parseEther } from 'ethers';

export const MintDsc = () => {
    const [dscAmount, setDscAmount] = useState("");
    const [message, setMessage] = useState("");

    const mintDsc = async () => {
        try {
            const { dsce } = await getContracts();

            const dscAmountWei = parseEther(dscAmount);

            setMessage("Minting DSC...");
            const mintTx = await dsce.mintDsc(dscAmountWei);
            await mintTx.wait();
            setMessage("DSC minted successfully!");
        } catch (error) {
            console.error("Error minting DSC:", error);
            setMessage("Error in contract call: " + (error.message || "Minting failed"));
        }
    }

    return (
        <div>
            <h2>Mint DSC</h2>
            <input 
                type='text'
                placeholder='Enter DSC amount'
                value={dscAmount}
                onChange={(e) => setDscAmount(e.target.value)}
            />
            <button onClick={mintDsc}>Mint</button>
            {message && <p>{message}</p>}
        </div>
    )
}