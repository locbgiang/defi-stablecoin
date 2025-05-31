import { useState } from "react";
import { getContracts } from "../utils/ContractUtils";
import { parseEther, Contract} from "ethers";

export const RedeemCollateral = () => {
    const [wethAmount, setWethAmount] = useState("");
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const redeemAllCollateral = async () => {
        try {
            setIsLoading(true);
            setMessage('Processing withdrawal of all collateral...');

            const { dsce, weth } = await getContracts();

            // Check if user has any collateral
            if (collateralBalance === "0") {
                setMessage('No collateral to withdraw.');
                setIsLoading(false);
                return;
            }

            // Withdrawing all collateral
            setMessage('Withdrawing all collateral...');
            const withdrawTx = await dsce.redeemCollateral(
                weth.target,
                collateralBalance
            )
            await withdrawTx.wait();

            setMessage('Success! All collateral withdrawn.');
            setWethAmount('');

            // Update balance
            updateCollateralBalance();
        } catch (error) {
            console.error('Error withdrawing all collateral:', error);
            if (error.message.includes('BreaksHealthFactor')) {
                setMessage('Error: Cannot withdraw all collateral, would break health factor. You may need to burn some DSC first.');
            } else {
                setMessage('Error in contract call: ' + (error.message || 'withdraw all failed'));
            } 
        } finally {
            setIsLoading(false);
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