import { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import DSCEngineABI from "../contracts/DSCEngine.json";
import DscABI from "../contracts/DecentralizedStableCoin.json";

const Web3Context = createContext();

export function Web3Provider({ children }) {
    
}