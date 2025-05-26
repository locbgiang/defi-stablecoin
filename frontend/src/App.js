import { Header } from "./components/Header";
import { WethConverter } from "./components/WethConverter";
import { DepositCollateralAndMintDsc } from "./components/DepositCollateralAndMintDsc";
import { DisplayUserData } from "./components/DisplayUserData";
import { RedeemCollateralForDsc } from "./components/RedeemCollateralForDsc";
import { DepositCollateral } from "./components/DepositCollateral";
import { RedeemCollateral } from "./components/RedeemCollateral";

import "./App.css";

function App() {
    return (
        <div className='app-container'>
            <Header />
            <DisplayUserData />
            <WethConverter />
            <DepositCollateralAndMintDsc />
            <RedeemCollateralForDsc />
        </div>
    );
}

export default App;