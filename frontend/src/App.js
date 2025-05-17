import { Header } from "./components/Header";
import { WethConverter } from "./components/WethConverter";
import { DepositCollateralAndMintDsc } from "./components/DepositCollateralAndMintDsc";
import { CheckContractStatus } from "./components/CheckContractStatus";

function App() {
    return (
        <div>
            <Header />
            <WethConverter />
            <CheckContractStatus />
        </div>
    );
}

export default App;