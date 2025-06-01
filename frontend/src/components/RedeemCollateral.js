import { useState } from "react";
import { getContracts } from "../utils/ContractUtils";
import { parseEther, Contract} from "ethers";

export const RedeemCollateral = () => {
    const [wethAmount, setWethAmount] = useState("");
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [collateralBalance, setCollateralBalance] = useState('0');

    const redeemCollateral = async () => {
        try {
            setIsLoading(true);
            setMessage('Processing withdrawal...');

            // Input validation
            if (!wethAmount || parseFloat(wethAmount) <= 0) {
                setMessage('Please enter a valid WETH amount to withdraw.');
                setIsLoading(false);
                return;
            }
            const { dsce, weth } = await getContracts();
            const wethAmountWei = parseEther(wethAmount);

            // Check if user has enough collateral
            if (wethAmountWei > BigInt(collateralBalance)) {
                setMessage(`Insufficient collateral. You have ${formatBalance(collateralBalance)}`);
                setIsLoading(false);
                return;
            }

            // Withdrawing collateral
            setMessage('Withdrawing collateral...');
            const withdrawTx = await dsce.redeemCollateral(
                weth.target,
                wethAmountWei
            );
            await withdrawTx.wait();

            setMessage('Success! Collateral withdrawn.');
            setWethAmount('');

            // Update user data
            updateUserData();

        } catch (error) {
            console.error('Error withdrawing collateral:', error);
            if (error.message.includes('BreaksHealthFactor')) {
                setMessage('Error: This is withdrawal would break your health factor.');
            } else {
                setMessage('Error in contract call: ' + (error.message || 'withdraw failed'));
            }
        } finally {
            setIsLoading(false);
        }
    }

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
            <div>
                <h3> Redeem Custom Amount </h3>
                <input 
                    type='number'
                    placeholder='Enter WETH amount'
                    value={wethAmount}
                    onChange={(e) => setWethAmount(e.target.value)}
                    disabled={isLoading}
                />
                <button
                    onClick={redeemCollateral}
                    disabled={isLoading || !wethAmount}
                >
                    {isLoading ? 'Processing...' : 'Redeem WETH'}
                </button>
            </div>

            <div>
                <h3> Redeem All Collateral </h3>
                <button 
                    onClick={redeemAllCollateral}
                    disabled={isLoading || collateralBalance === '0'}
                >
                    {isLoading ? 'Processing...' : `Redeem All (${formatBalance(collateralBalance)})`}
                </button>
                <p>⚠️ This will withdraw all your collateral. Make sure you have no DSC minted or this will fail.</p>
            </div>

            {message && <p>{message}</p>}
        </div>
    )
}