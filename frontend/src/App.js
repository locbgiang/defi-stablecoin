import { Header } from "./components/Header";
import { WethConverter } from "./components/WethConverter";
import { DepositCollateralAndMintDsc } from "./components/DepositCollateralAndMintDsc";
import { CheckContractStatus } from "./components/CheckContractStatus";
import { DepositCollateral } from "./components/DepositCollateral";

function App() {
    return (
        <div>
            <Header />
            <WethConverter />
            <CheckContractStatus />
            <DepositCollateral />
        </div>
    );
}

export default App;