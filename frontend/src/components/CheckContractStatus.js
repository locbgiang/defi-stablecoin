import { useState } from "react"; 
import { getContracts } from "../utils/ContractUtils";
import { parseEther, Contract } from "ethers";

export const CheckContractStatus = () => {
    const [message, setMessage] = useState("");

    const checkContractStatus = async () => {
        try {
            setMessage("Checking contract status...");
            const { dsce, dsc, signer, weth } = await getContracts();
            const userAddress = await signer.getAddress();

            // Get collateral balance
            const collateralBalance = await dsce.getCollateralBalanceOfUser(
                weth.target,
                userAddress
            );

            // Get DSC balance
            const dscBalance = await dsc.balanceOf(userAddress);

            // Get health factor 
            const healthFactor = await dsce.getHealthFactor(userAddress);

            const wethBalance = await weth.balanceOf(userAddress);
            
            // Format and display the results
            setMessage(`
                Status:
                - WETH Collateral: ${collateralBalance.toString()} wei
                - DSC Balance: ${dscBalance.toString()} wei
                - Health Factor: ${healthFactor.toString()} 
                - WETH Balance: ${wethBalance.toString()} wei
            `)
        } catch (error) {
            console.error("Error checking status:", error);
            setMessage("Error checking contract status: " + error.message);
        }
    }

    return (
        <div>
            <h2>Check Contract Data</h2>
            <button onClick={checkContractStatus}>
                Check Contract Status
            </button>
            {message && <p>{message}</p>}
        </div>
    )
}