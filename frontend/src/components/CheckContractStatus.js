import { useState } from "react"; 
import { getContracts } from "../utils/ContractUtils";
import { parseEther, Contract } from "ethers";

const WETH_ADDRESS = "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9";

const WETH_ABI = [
    "function balanceOf(address account) external view returns (uint256)",
    "function approve(address spender, uint256 amount) external returns (bool)",
]
export const CheckContractStatus = () => {
    const [message, setMessage] = useState("");

    const checkContractStatus = async () => {
        try {
            setMessage("Checking contract status...");
            const { dsce, dsc, signer } = await getContracts();
            const userAddress = await signer.getAddress();

            // Get collateral balance
            const collateralBalance = await dsce.getCollateralBalanceOfUser(
                WETH_ADDRESS,
                userAddress
            );

            // Get DSC balance
            const dscBalance = await dsc.balanceOf(userAddress);

            // Get health factor 
            const healthFactor = await dsce.getHealthFactor(userAddress);

            // Check WETH balance
            const wethContract = new Contract(
                WETH_ADDRESS,
                WETH_ABI,
                signer
            )
            const wethBalance = await wethContract.balanceOf(userAddress);
            
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