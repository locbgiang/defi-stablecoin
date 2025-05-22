import { useState } from "react";
import { getContracts } from "../utils/ContractUtils";
import { parseEther, Contract, id } from "ethers";

const WETH_ADDRESS = "0xdd13E55209Fd76AfE204dBda4007C227904f0a81";

const WETH_ABI = [
    "function balanceOf(address account) external view returns (uint256)",
    "function approve(address spender, uint256 amount) external returns (bool)",
]

export const DepositCollateral = () => { 
    const [wethAmount, setWethAmount] = useState("");
    const [message, setMessage] = useState("");

    const depositCollateral = async () => {        
        try {
            const { dsce, signer } = await getContracts();
            const weth = new Contract(
                WETH_ADDRESS,
                WETH_ABI,
                signer
            );

            const wethAmountWei = parseEther(wethAmount);

            // approving WETH for the DSCE contract
            setMessage("Approving WETH for DSCE...");
            const approveTx = await weth.approve(
                await dsce.getAddress(),
                wethAmountWei
            )
            await approveTx.wait();

            setMessage("Depositing collateral...");
            const depositTx = await dsce.depositCollateral(
                WETH_ADDRESS,
                wethAmountWei
            );
            await depositTx.wait();

        } catch (error) {
            console.error("Error depositing collateral:", error);
            setMessage("Error in contract call: " + (error.message || "Deposit failed"));
        }
    }


    return(
        <div>
            <h2>Deposit Collateral</h2>
            <input 
                type='text'
                placeholder='Enter WETH amount'
                value={wethAmount}
                onChange={(e) => setWethAmount(e.target.value)}
            />
            <button onClick={depositCollateral}>Deposit</button>
            {message && <p>{message}</p>}
        </div>
    )
}