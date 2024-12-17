import Onboard from '@web3-onboard/core';
import injectedModule from '@web3-onboard/injected-wallets';
import walletConnectModule from '@web3-onboard/walletconnect';

const injected = injectedModule();
const walletConnect = walletConnectModule({
  projectId: '71ee4f6d17ff108566d692478bb9ff47',
  version: 2,
  requiredChains: [97]
});

const onboard = Onboard({
  wallets: [injected, walletConnect],
  chains: [
    {
      id: '0x61',
      token: 'tBNB',
      label: 'BSC Testnet',
      rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
      blockExplorerUrl: 'https://testnet.bscscan.com'
    }
  ],
  appMetadata: {
    name: 'Investment Platform',
    description: 'Investment Platform on BSC',
    recommendedInjectedWallets: [
      { name: 'MetaMask', url: 'https://metamask.io' },
      { name: 'SafePal', url: 'https://safepal.io' }
    ]
  },
  connect: {
    autoConnectLastWallet: true
  },
  accountCenter: {
    mobile: { enabled: true },
    desktop: { enabled: true }
  }
});

export const USDT_CONTRACT_ADDRESS = "0xc02aF1D555760Dbef0641D0e893CCd6AC63A0751";

export default onboard; 