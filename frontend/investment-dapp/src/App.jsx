import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import { ethers } from 'ethers';
import InvestmentPlatform from './assets/abi/InvestmentPlatform.json';
import DonationPlans from './components/DonationPlans/DonationPlans';
import UserDonation from './components/UserDonation/UserDonation';
import DonationPopup from './components/DonationPopup/DonationPopup';
import ClaimRewardPopup from './components/ClaimRewardPopup/ClaimRewardPopup';
import Dashboard from './components/Dashboard/Dashboard';
import './App.css';

function App() {
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

  const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS;

  const loadUserData = async () => {
    if (contract && account) {
      try {
        const userDetails = await contract.methods.getUserDetails().call({ from: account });
        
        const donationAmount = parseInt(userDetails.amount) / 10**6;
        const donationPlan = parseInt(userDetails.duration);
        
        setMyDonation(donationAmount);
        setMyDonationPlan(donationPlan);
        setIsReferrer(userDetails.isReferrer);

        const nextReward = await contract.methods.getNextPayout(account).call({ from: account });
        
        if (nextReward && nextReward.time && nextReward.amount) {
          const timestamp = parseInt(nextReward.time);
          const amount = parseInt(nextReward.amount) / 10**6;

          if (timestamp > 0) {
            setNextRewardDate(timestamp * 1000);
            setNextRewardAmount(amount);
          } else {
            setNextRewardDate(null);
            setNextRewardAmount(0);
          }
        } else {
          setNextRewardDate(null);
          setNextRewardAmount(0);
        }

        // Get total invested and paid out using existing contract methods
        const totalInvestedAmount = await contract.methods.totalInvested().call();
        const totalPaidOutAmount = await contract.methods.totalPaid().call();
        setTotalDonated(parseInt(totalInvestedAmount) / 10**6);
        setTotalPaidOut(parseInt(totalPaidOutAmount) / 10**6);

      } catch (error) {
        console.error('Error loading user data:', error);
        setError('Error loading user data. Please try again.');
      }
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        if (typeof window.ethereum !== 'undefined') {
          const web3Instance = new Web3(window.ethereum);
          setWeb3(web3Instance);

          if (!contractAddress) {
            throw new Error('Contract address not configured');
          }

          const contractInstance = new web3Instance.eth.Contract(
            InvestmentPlatform.abi,
            contractAddress
          );
          setContract(contractInstance);

          const accounts = await web3Instance.eth.getAccounts();
          if (accounts.length > 0) {
            setAccount(accounts[0]);
          }

          window.ethereum.on('accountsChanged', (accounts) => {
            if (accounts.length > 0) {
              setAccount(accounts[0]);
            } else {
              setAccount('');
            }
          });

          setLoading(false);
        } else {
          throw new Error('Please install MetaMask');
        }
      } catch (error) {
        console.error('Initialization error:', error);
        setError(error.message);
        setLoading(false);
      }
    };

    init();
  }, [contractAddress]);

  useEffect(() => {
    loadUserData();
  }, [contract, account]);

  const handleConnectWallet = async () => {
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const accounts = await web3.eth.getAccounts();
      setAccount(accounts[0]);
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setError('Error connecting wallet. Please try again.');
    }
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

      await usdtContract.methods
        .approve(contract._address, referrerFee)
        .send({ from: account });

      await contract.methods
        .activateReferrer()
        .send({ from: account });

      setIsReferrer(true);
    } catch (error) {
      console.error('Error activating referrer:', error);
      throw error;
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
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
        <h1>Donation Platform</h1>
        {!account ? (
          <button onClick={handleConnectWallet} className="connect-wallet-button">
            Connect Wallet
          </button>
        ) : null}
      </header>

      <main>
        {account ? (
          <>
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
          </>
        ) : (
          <div className="connect-prompt">
            Please connect your wallet to continue
          </div>
        )}
      </main>
    </div>
  );
}

export default App; 