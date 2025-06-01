import React, { useState } from 'react';
import { useUser } from '../Context';
import './Header.css';

export const Header = () => {
    const { userData, connectWallet, disconnectWallet, loading, error } = useUser();
    const [isHovered, setIsHovered] = useState(false); // State to track hover

    const handleWalletAction = () => {
        if (userData.address) {
            // If connected, disconnect on click
            disconnectWallet();
        } else {
            // If not connected, connect wallet
            connectWallet();
        }
    };

    return (
        <div className="header">
            <div className="logo">Decentralized Stablecoin</div>
            <button 
                className="connect-button"
                onClick={handleWalletAction}
                onMouseEnter={() => setIsHovered(true)} // Set hover state to true
                onMouseLeave={() => setIsHovered(false)} // Set hover state to false
            >
                {
                userData.address 
                    ? isHovered // if account is connected check hover state
                        ? userData.address // show full account on hover
                        : `${userData.address.substring(0, 6)}...${userData.address.substring(userData.address.length - 4)}` 
                    : 'Connect Wallet'
                }
            </button>
        </div>
    )
}