import React, { useState } from 'react';
import './Header.css';

export const Header = () => {
    const [account, setAccount] = useState('');

    const connectWallet = async () => {
        if (window.ethereum) {
            try {
                // Request account access 
                const accounts = await window.ethereum.request({
                    method: 'eth_requestAccounts'
                });
                setAccount(accounts[0]);
            } catch (error) {
                console.error("User denied account access");
            }
        } else {
            alert('Please install MetaMask!');
        }
    }; 

    return (
        <div className="header">
            <div className="logo">Decentralized Stablecoin</div>
            <button 
                className="connect-button"
                onClick={connectWallet}
            >
                {account ? `${account.substring(0, 6)}...${account.substring(account.length - 4)}` : 'Connect Wallet'}
            </button>
        </div>
    )
}