import { useState } from "react";
import { getContracts } from "../utils/ContractUtils";
import { parseEther, Contract} from "ethers";

export const RedeemCollateral = () => {
    const [wethAmount, setWethAmount] = useState("");
    const [message, setMessage] = useState("");

    const redeemCollateral = async () => {
        try {
            const { dsce, weth } = await getContracts();
            const wethAmountWei = parseEther(wethAmount);

            // withdrawing collateral
            setMessage("Withdrawing collateral...");
            const withdrawTx = await dsce.redeemCollateral(
                weth.target,
                wethAmountWei
            )
            await withdrawTx.wait();

        } catch (error) {
            console.error("Error withdrawing collateral:", error);
            setMessage("Error in contract call: " + (error.message || "withdraw failed"));
        }
    }

    return(
        <div>
            <h2>Redeem Collateral</h2>
            <input 
                type='text'
                placeholder='Enter WETH amount'
                value={wethAmount}
                onChange={(e) => setWethAmount(e.target.value)}
            />
            <button onClick={redeemCollateral}>Redeem</button>
            {message && <p>{message}</p>}
        </div>
    )
}