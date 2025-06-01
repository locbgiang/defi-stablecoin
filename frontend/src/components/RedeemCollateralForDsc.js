import React, { useState } from "react";
import { getContracts } from "../utils/ContractUtils";
import { parseEther, id } from "ethers";
import { useUser } from '../Context';

export const RedeemCollateralForDsc = () => {
    const { userData, connectWallet, disconnectWallet, loading, error } = useUser();
    const [collateralAmount, setCollateralAmount] = useState("");
    const [dscToBurnAmount, setDscToBurnAmount] = useState("");
    const [message, setMessage] = useState("");

    /*
    const redeemCollateralForDsc = async () => {
        const { dsce, weth } = await getContracts();
        const wethAmountWei = parseEther(collateralAmount);
        const dscAmountWei = parseEther(dscToBurnAmount);

        setMessage('Withdrawing collateral...');
        const withdrawTx = await dsce.redeemCollateral(
            weth.target,
            wethAmountWei
        );
        await withdrawTx.wait();

        setMessage('Success! collateral withdrawn!');
    }*/

    const redeemAllCollateralForDsc = async () => {
        try {
            // const { dsce, dsc, weth, signer } = await getContracts();
            // const userAddress = await signer.getAddress();
            
            // Get user's DSC balance and collateral balance
            /*
            const [
                dscBalance,
                colBalance,
            ] = await Promise.all([
                dsc.balanceOf(userAddress),
                dsce.getCollateralBalanceOfUser(
                    userAddress,
                    weth.target
                )
            ])
            */
            console.log(userData)

            
            // Withdrawing all collateral
            setMessage('Withdrawing all collateral...');
            const withdrawTx = await dsce.redeemCollateralForDsc(
                weth.target,
                colBalance,
                dscBalance
            )
            await withdrawTx.wait();
            

            setMessage('Success! All collateral withdrawn.');
        } catch (error) {
            console.error('Error withdrawing all collateral:', error);
            if (error.message.includes('BreaksHealthFactor')) {
                setMessage('Error: Cannot withdraw all collateral, would break health factor. You may need to burn some DSC first.')
            } else {
                setMessage('Error in contract call: ' + (error.message || 'withdraw all failed'));
            }
        }
    }

    return (
        <div>
            <h2>Redeem Collateral For DSC</h2>
            {/*<div>
                <h3> Redeem Custom Amount </h3>
                <input 
                    type='number'
                    placeholder='Enter WETH amount'
                    value={collateralAmount}
                    onChange={(e) => setCollateralAmount(e.target.value)}
                />
                <input
                    type='number'
                    placeholder='Enter DSC amount to burn'
                    value={dscToBurnAmount}
                    onChange={(e) => setDscToBurnAmount(e.target.value)}
                />
                <button 
                    onClick={redeemCollateralForDsc}
                >
                    Redeem WETH for DSC
                </button>
            </div>*/}

            <div>
                <h3> Redeem All Collateral </h3>
                <button 
                    onClick={redeemAllCollateralForDsc}
                >
                    Redeem All
                </button>
                <p>⚠️ This will withdraw all your collateral. Make sure you have no DSC minted or this will fail. </p>
            </div>

            {message && <p>{message}</p>}
        </div>
    )
}