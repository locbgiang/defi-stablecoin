import { Header } from "./components/Header";
import { WethConverter } from "./components/WethConverter";
import { DepositCollateralAndMintDsc } from "./components/DepositCollateralAndMintDsc";
import { CheckContractStatus } from "./components/CheckContractStatus";
import { DepositCollateral } from "./components/DepositCollateral";
import { RedeemCollateral } from "./components/RedeemCollateral";

function App() {
    return (
        <div>
            <Header />
            <WethConverter />
            <CheckContractStatus />
            <DepositCollateralAndMintDsc />
        </div>
    );
}

export default App;