import { Header } from "./components/Header";
import { WethConverter } from "./components/WethConverter";
//import { WbtcConverter } from "./components/WbtcConverter";
import { DepositCollateralAndMintDsc } from "./components/DepositCollateralAndMintDsc";
import { DisplayUserData } from "./components/DisplayUserData";
import { RedeemCollateralForDsc } from "./components/RedeemCollateralForDsc";
import { Liquidation } from "./components/Liquidation";

import "./App.css";

function App() {
    return (
        <div className='app-container'>
            <Header />
            <DisplayUserData />
            <div className='body'>
                <WethConverter />
                <DepositCollateralAndMintDsc />
                <RedeemCollateralForDsc />
                <Liquidation />
            </div>
        </div>
    );
}

export default App;