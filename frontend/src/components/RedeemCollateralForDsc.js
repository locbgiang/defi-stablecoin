import React, { useState } from "react";
import { getContracts } from "../utils/ContractUtils";
import { parseEther, id } from "ethers";

export const RedeemCollateralForDsc = () => {
    const [collateralAmount, setCollateralAmount] = useState("");
    const [message, setMessage] = useState("");


    const redeemCollateralForDsc = async () => {
        try {
            const { dsce, dsc, weth, signer } = await getContracts();
            const userAddress = await signer.getAddress();

            const collateralAmountWei = parseEther(collateralAmount);
            const exactDscBalance = await dsc.balanceOf(userAddress);

            // approving the DSCEngine contract to burn DSC
            setMessage("Approving DSCEngine to burn DSC...");
            const approveTx = await dsc.approve(
                await dsce.getAddress(),
                exactDscBalance
            )
            await approveTx.wait();
            setMessage("DSCEngine approved to burn DSC");

            // redeeming collateral for DSC
            setMessage("Redeeming collateral for DSC...");
            const redeemTx = await dsce.redeemCollateralForDsc(
                weth.target, // address of the collateral token
                collateralAmountWei, // amount of collateral to redeem
                exactDscBalance // amount of DSC to burn
            );
            await redeemTx.wait();

        } catch (error) {
            console.error("Error redeeming collateral for DSC;", error);
            setMessage("Error in contract call: " + (error.message || "Redeeming failed"));
        }
    }

    return (
        <div>
            <h2>Redeem Collateral For DSC</h2>
            <input 
                type='text'
                placeholder='Enter collateral amount'
                value={collateralAmount}
                onChange={(e) => setCollateralAmount(e.target.value)}
            />
            <button onClick={redeemCollateralForDsc}>Redeem</button>
            {message && <p>{message}</p>}
        </div>
    )
}