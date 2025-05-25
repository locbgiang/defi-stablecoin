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

            // add debugging info
            console.log("=== DEBUGGING INFO ===");
            console.log("User Address:", userAddress);
            console.log("DSCEngine Address:", await dsce.getAddress());
            console.log("WETH Address:", weth.target);
            console.log("DSC Address:", await dsc.getAddress());

            // Get collateral balance
            const collateralBalance = await dsce.getCollateralBalanceOfUser(
                userAddress,
                weth.target
            );

            const contractWethBalance = await weth.balanceOf(
                dsce.getAddress()
            )

            // Add this to your CheckContractStatus
            const oldWethCollateral = await dsce.getCollateralBalanceOfUser(
                userAddress,
                "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9" // Old WETH
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
                - Contract Collateral Balance: ${contractWethBalance.toString()} wei
                - Old WETH Collateral: ${oldWethCollateral.toString()} wei
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