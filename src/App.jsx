import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import { ethers } from 'ethers';
import { useConnectWallet } from '@web3-onboard/react';
import DonationPlatform from './assets/abi/InvestmentPlatform.json';
import ConnectWallet from './components/ConnectWallet/ConnectWallet';
import DonationPlans from './components/DonationPlans/DonationPlans';
import UserDonation from './components/UserDonation/UserDonation';
import DonationPopup from './components/DonationPopup/DonationPopup';
import ClaimRewardPopup from './components/ClaimRewardPopup/ClaimRewardPopup';
import Dashboard from './components/Dashboard/Dashboard';
import './App.css';

function App() {
  const [{ wallet }] = useConnectWallet();
  const [web3, setWeb3] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState('');
  const [myDonation, setMyDonation] = useState(0);
  const [myDonationPlan, setMyDonationPlan] = useState(0);
  const [nextRewardDate, setNextRewardDate] = useState(null);
  const [nextRewardAmount, setNextRewardAmount] = useState(0);
  const [isReferrer, setIsReferrer] = useState(false);
  const [showDonationPopup, setShowDonationPopup] = useState(false);
  const [showClaimRewardPopup, setShowClaimRewardPopup] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalDonated, setTotalDonated] = useState(0);
  const [totalPaidOut, setTotalPaidOut] = useState(0);
  const [wrongNetwork, setWrongNetwork] = useState(false);

  const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS;

  useEffect(() => {
    const initWeb3 = async () => {
      if (wallet?.provider) {
        try {
          const web3Instance = new Web3(wallet.provider);
          setWeb3(web3Instance);

          // Check and switch chain
          const chainId = await web3Instance.eth.getChainId();
          if (chainId !== 56) { // BSC Mainnet
            try {
              await wallet.provider.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x38' }], // BSC Mainnet in hex
              });
            } catch (switchError) {
              // This error code means the chain has not been added to MetaMask
              if (switchError.code === 4902) {
                try {
                  await wallet.provider.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                      chainId: '0x38',
                      chainName: 'BSC Network',
                      nativeCurrency: {
                        name: 'BNB',
                        symbol: 'BNB',
                        decimals: 18
                      },
                      rpcUrls: ['https://bsc-dataseed1.binance.org'],
                      blockExplorerUrls: ['https://bscscan.com']
                    }]
                  });
                } catch (addError) {
                  console.error('Error adding chain:', addError);
                  setWrongNetwork(true);
                }
              } else {
                console.error('Error switching chain:', switchError);
                setWrongNetwork(true);
              }
            }
          }

          if (contractAddress) {
            const contractInstance = new web3Instance.eth.Contract(
              DonationPlatform,
              contractAddress
            );
            setContract(contractInstance);
          }

          const accounts = await web3Instance.eth.getAccounts();
          if (accounts[0]) {
            setAccount(accounts[0]);
          }
          
          setWrongNetwork(false);
          setLoading(false);
        } catch (error) {
          console.error('Web3 initialization error:', error);
          setError('Failed to initialize Web3');
          setLoading(false);
        }
      }
    };

    initWeb3();
  }, [wallet, contractAddress]);

  // Add chain change listener
  useEffect(() => {
    if (wallet?.provider) {
      wallet.provider.on('chainChanged', (chainId) => {
        if (chainId !== '0x38') {
          setWrongNetwork(true);
        } else {
          setWrongNetwork(false);
          window.location.reload();
        }
      });
    }
  }, [wallet]);

  const loadUserData = async () => {
    if (contract && account) {
      try {
        const userDetails = await contract.methods.getUserDetails().call({ from: account });
        
        if (userDetails) {
          const donationAmount = parseInt(userDetails[0]) / 10**6;
          const donationPlan = parseInt(userDetails[1]);
          
          setMyDonation(donationAmount);
          setMyDonationPlan(donationPlan);
          setIsReferrer(userDetails[6]);

          const nextReward = await contract.methods.getNextPayout(account).call();
          
          if (nextReward) {
            const timestamp = parseInt(nextReward[1]);
            const amount = parseInt(nextReward[0]) / 10**6;

            if (timestamp > 0) {
              setNextRewardDate(timestamp * 1000);
              setNextRewardAmount(amount);
            } else {
              setNextRewardDate(null);
              setNextRewardAmount(0);
            }
          }

          const totalInvestedAmount = await contract.methods.totalDonated().call();
          const totalPaidOutAmount = await contract.methods.totalPaid().call();
          setTotalDonated(parseInt(totalInvestedAmount) / 10**6);
          setTotalPaidOut(parseInt(totalPaidOutAmount) / 10**6);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        setError('Error loading user data. Please try again.');
      }
    }
  };

  useEffect(() => {
    loadUserData();
  }, [contract, account]);

  const handleConnectWallet = (address) => {
    setAccount(address);
  };

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    setShowDonationPopup(true);
  };

  const handleActivateReferrer = async () => {
    try {
      const referrerFee = await contract.methods.referrerFeeUsd().call();
      const usdtContract = new web3.eth.Contract(
        [{"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"type":"function"},{"constant":false,"inputs":[{"name":"_spender","type":"address"},{"name":"_value","type":"uint256"}],"name":"approve","outputs":[{"name":"success","type":"bool"}],"type":"function"}],
        process.env.REACT_APP_USDT_CONTRACT_ADDRESS
      );

      const approvalTx = await usdtContract.methods
        .approve(contract._address, referrerFee)
        .send({ from: account });
        
      if (!approvalTx.status) {
        throw new Error('USDT approval failed');
      }

      const activateTx = await contract.methods
        .activateReferrer()
        .send({ from: account });
        
      if (!activateTx.status) {
        throw new Error('Activation transaction failed');
      }

      setIsReferrer(true);
    } catch (error) {
      console.error('Error activating referrer:', error);
      throw new Error(error.message || 'Failed to activate referrer');
    }
  };

  if (!account) {
    return (
      <div className="App">
        <div className="morphing-background">
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="wave-segment"
              style={{
                left: `${i * (100 / 40)}%`,
                backgroundPosition: `${(i / 39) * 100}% center`,
                animationDelay: `${(i / 40) * 3}s`
              }}
            />
          ))}
        </div>
        <div className="morphing-background-overlay"></div>
        <ConnectWallet onConnected={handleConnectWallet} />
      </div>
    );
  }

  if (wrongNetwork) {
    return (
      <div className="App">
        <div className="morphing-background">
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="wave-segment"
              style={{
                left: `${i * (100 / 40)}%`,
                backgroundPosition: `${(i / 39) * 100}% center`,
                animationDelay: `${(i / 40) * 3}s`
              }}
            />
          ))}
        </div>
        <div className="morphing-background-overlay"></div>
        <div className="wrong-network-container">
          <h2>Wrong Network</h2>
          <p>Please switch to BSC Network to use this application.</p>
          <button 
            onClick={async () => {
              try {
                await wallet.provider.request({
                  method: 'wallet_switchEthereumChain',
                  params: [{ chainId: '0x38' }],
                });
              } catch (error) {
                console.error('Error switching chain:', error);
              }
            }}
            className="switch-network-button"
          >
            Switch to BSC Network
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="App">
        <div className="morphing-background">
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="wave-segment"
              style={{
                left: `${i * (100 / 40)}%`,
                backgroundPosition: `${(i / 39) * 100}% center`,
                animationDelay: `${(i / 40) * 3}s`
              }}
            />
          ))}
        </div>
        <div className="morphing-background-overlay"></div>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="App">
      <div className="morphing-background">
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="wave-segment"
            style={{
              left: `${i * (100 / 40)}%`,
              backgroundPosition: `${(i / 39) * 100}% center`,
              animationDelay: `${(i / 40) * 3}s`
            }}
          />
        ))}
      </div>
      <div className="morphing-background-overlay"></div>

      <header className="App-header">
        <h1>True Wealth Prosperity Network</h1>
      </header>

      <main>
        <Dashboard
          totalDonated={totalDonated}
          totalPaidOut={totalPaidOut}
          myDonation={myDonation}
          myDonationPlan={myDonationPlan}
          nextRewardDate={nextRewardDate}
          nextRewardAmount={nextRewardAmount}
          isReferrer={isReferrer}
          handleActivateReferrer={handleActivateReferrer}
          setShowClaimRewardPopup={setShowClaimRewardPopup}
          setSelectedPlan={handleSelectPlan}
          contract={contract}
        />

        {showDonationPopup && selectedPlan && (
          <DonationPopup
            plan={selectedPlan}
            onClose={() => setShowDonationPopup(false)}
            refreshDashboard={() => loadUserData()}
            contract={contract}
            usdtContract={new web3.eth.Contract(
              [{"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"type":"function"},{"constant":false,"inputs":[{"name":"_spender","type":"address"},{"name":"_value","type":"uint256"}],"name":"approve","outputs":[{"name":"success","type":"bool"}],"type":"function"}],
              process.env.REACT_APP_USDT_CONTRACT_ADDRESS
            )}
            contractAddress={contractAddress}
            setSuccessPopup={(message) => {
              // Handle success popup if needed
              console.log(message);
            }}
            referralAddress={new URLSearchParams(window.location.search).get('ref')}
          />
        )}

        {showClaimRewardPopup && (
          <ClaimRewardPopup
            show={showClaimRewardPopup}
            onClose={() => setShowClaimRewardPopup(false)}
            contract={contract}
            account={account}
            web3={web3}
            rewardAmount={nextRewardAmount}
          />
        )}
      </main>
    </div>
  );
}

export default App; 