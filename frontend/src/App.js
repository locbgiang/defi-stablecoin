import { Header } from "./components/Header";
import { WethConverter } from "./components/WethConverter";
import { DepositCollateralAndMintDsc } from "./components/DepositCollateralAndMintDsc";

function App() {
    return (
        <div>
            <Header />
            <WethConverter />
            <DepositCollateralAndMintDsc />
        </div>
    );
}

export default App;