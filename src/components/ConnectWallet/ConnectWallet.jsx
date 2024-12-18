import React from 'react';
import { Buffer } from 'buffer';
import { init, useConnectWallet } from '@web3-onboard/react';
import injectedModule from '@web3-onboard/injected-wallets';
import coinbaseModule from '@web3-onboard/coinbase';
import torusModule from '@web3-onboard/torus';
import trustModule from '@web3-onboard/trust';
import walletLinkModule from '@web3-onboard/walletlink';
import './ConnectWallet.css';

// Add Buffer to window object
window.Buffer = window.Buffer || Buffer;

// Initialize wallet modules
const injected = injectedModule();
const coinbase = coinbaseModule();
const torus = torusModule();
const trust = trustModule();
const walletLink = walletLinkModule();

const web3Onboard = init({
  wallets: [
    injected,
    coinbase,
    torus,
    trust,
    walletLink
  ],
  chains: [
    {
      id: '0x38',
      token: 'BNB',
      label: 'BSC Network',
      rpcUrl: 'https://bsc-dataseed1.binance.org',
      blockExplorerUrl: 'https://bscscan.com'
    }
  ],
  appMetadata: {
    name: 'True Wealth Prosperity Network',
    description: 'True Wealth Prosperity Network DApp',
    explore: `https://bscscan.com/address/0xa9B93C2d44472bb47fF7126Bca0c0051Ae5100D3`
  },
  theme: {
    '--w3o-background-color': '#1a1a1a',
    '--w3o-foreground-color': '#ffffff',
    '--w3o-text-color': '#ffffff',
    '--w3o-border-color': '#3a3a3a',
    '--w3o-action-color': '#6b21a8',
    '--w3o-border-radius': '8px'
  },
  accountCenter: {
    desktop: {
      enabled: true,
      position: 'topRight'
    },
    mobile: {
      enabled: true,
      position: 'topRight'
    }
  },
  connect: {
    autoConnectLastWallet: true,
    showSidebar: true,
    disableClose: false
  },
  notify: {
    desktop: {
      enabled: true,
      position: 'bottomRight',
      transactionHandler: transaction => {
        console.log({ transaction });
        return {
          autoDismiss: 0,
          onClick: () => window.open(`https://bscscan.com/tx/${transaction.hash}`)
        };
      }
    },
    mobile: {
      enabled: true,
      position: 'topRight',
      transactionHandler: transaction => {
        console.log({ transaction });
        return {
          autoDismiss: 0,
          onClick: () => window.open(`https://bscscan.com/tx/${transaction.hash}`)
        };
      }
    }
  }
});

const ConnectWallet = ({ onConnected }) => {
  const [{ wallet, connecting }, connect] = useConnectWallet();

  React.useEffect(() => {
    if (wallet?.provider) {
      const { accounts, chains } = wallet;
      const address = accounts[0].address;
      const chainId = chains[0].id;

      // Check if we're on BSC Testnet
      if (chainId !== '0x38') {
        web3Onboard.setChain({ chainId: '0x38' });
      }

      onConnected(address);

      // Add account change listener
      const handleAccountsChanged = (accounts) => {
        if (accounts.length > 0) {
          onConnected(accounts[0].address);
        }
      };

      // Add disconnect handler
      const handleDisconnect = () => {
        onConnected(null);
        // Optionally force a page reload to clear all states
        window.location.reload();
      };

      // Listen for account changes and disconnect events using the provider's events
      if (wallet.provider.on) {
        wallet.provider.on('accountsChanged', handleAccountsChanged);
        wallet.provider.on('disconnect', handleDisconnect);

        return () => {
          wallet.provider.removeListener('accountsChanged', handleAccountsChanged);
          wallet.provider.removeListener('disconnect', handleDisconnect);
        };
      }
    }
  }, [wallet, onConnected]);

  return (
    <div className="connect-wallet-container">
      <button 
        onClick={() => connect()} 
        disabled={connecting}
        className="connect-wallet-button"
      >
        {connecting ? 'Connecting...' : 'Connect Wallet'}
      </button>
    </div>
  );
};

export default ConnectWallet;
