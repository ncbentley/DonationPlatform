import React from 'react';
import { Buffer } from 'buffer';
import { init, useConnectWallet } from '@web3-onboard/react';
import injectedModule from '@web3-onboard/injected-wallets';
import walletConnectModule from '@web3-onboard/walletconnect';
import coinbaseModule from '@web3-onboard/coinbase';
import torusModule from '@web3-onboard/torus';
import trustModule from '@web3-onboard/trust';
import walletLinkModule from '@web3-onboard/walletlink';
import safeModule from '@web3-onboard/gnosis';
import './ConnectWallet.css';

// Add Buffer to window object
window.Buffer = window.Buffer || Buffer;

// Initialize wallet modules
const injected = injectedModule();
const walletConnect = walletConnectModule({
  projectId: process.env.REACT_APP_WALLET_CONNECT_PROJECT_ID || '71ee4f6d17ff108566d692478bb9ff47',
  version: 2,
  requiredChains: [56]
});
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
    icon: '/images/twpn-logo.png',
    logo: '/images/twpn-logo.png',
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
  const [{ wallet, connecting }, connect, disconnect] = useConnectWallet();

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
