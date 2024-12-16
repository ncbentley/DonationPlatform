import React from 'react';
import './ConnectWallet.css';
import onboard from '../../config/walletConfig';

const ConnectWallet = ({ onConnected }) => {
  const connectWallet = async () => {
    try {
      const wallets = await onboard.connectWallet();
      
      if (wallets[0]) {
        const { accounts, chains } = wallets[0];
        const address = accounts[0].address;
        const chainId = chains[0].id;

        // Check if we're on BSC Testnet
        if (chainId !== '0x61') {
          await onboard.setChain({ chainId: '0x61' });
        }

        onConnected(address);
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
    }
  };

  return (
    <div className="connect-wallet-container">
      <h1>Welcome to Investment Platform</h1>
      <p>Connect your wallet to continue</p>
      <button onClick={connectWallet} className="connect-wallet-button">
        Connect Wallet
      </button>
    </div>
  );
};

export default ConnectWallet;
