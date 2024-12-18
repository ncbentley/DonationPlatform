import React, { useState, useEffect, useCallback } from 'react';
import Web3 from 'web3';
import './DonationPopup.css';
import TransactionConfirmPopup from '../TransactionConfirmPopup/TransactionConfirmPopup';
import ErrorPopup from '../ErrorPopup/ErrorPopup';

const DonationPopup = ({ 
  plan, 
  onClose, 
  refreshDashboard, 
  contract, 
  usdtContract,
  contractAddress,
  setSuccessPopup,
  referralAddress 
}) => {
  const [sponsorAddress, setSponsorAddress] = useState(referralAddress || "");
  const [donationAmount, setDonationAmount] = useState(100);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingTransaction, setPendingTransaction] = useState(null);
  const [usdtBalance, setUsdtBalance] = useState(0);
  const [hasEnoughBalance, setHasEnoughBalance] = useState(false);
  const [showError, setShowError] = useState(false);
  const [swapUrl, setSwapUrl] = useState('');
  const [hasAgreedToTerms, setHasAgreedToTerms] = useState(false);

  const calculateTotals = useCallback(() => {
    const depositFee = (donationAmount * 3) / 100; // 3% fee
    const totalUsd = donationAmount + depositFee;
    
    return {
      depositFee,
      totalUsd
    };
  }, [donationAmount]);

  const checkUsdtBalance = useCallback(async () => {
    try {
      if (!usdtContract || !usdtContract.methods) return;

      const web3 = new Web3(window.ethereum);
      const accounts = await web3.eth.getAccounts();
      if (!accounts.length) return;

      const balance = await usdtContract.methods.balanceOf(accounts[0]).call();
      const balanceInUsd = parseInt(balance) / 10**18; // Convert from USDT decimals
      setUsdtBalance(balanceInUsd);

      // Check if balance is sufficient for donation + fee
      const requiredAmount = calculateTotals().totalUsd;
      setHasEnoughBalance(balanceInUsd >= requiredAmount);
      
      if (balanceInUsd < requiredAmount) {
        setErrorMessage(`Insufficient USDT balance. You have $${balanceInUsd.toFixed(2)} USDT but need $${requiredAmount.toFixed(2)} USDT`);
      } else {
        setErrorMessage("");
      }
    } catch (error) {
      console.error("Failed to check USDT balance:", error);
      setShowError(true);
      setErrorMessage(error.message || "Failed to check USDT balance");
    }
  }, [usdtContract, calculateTotals]);

  useEffect(() => {
    if (!contract || !contract.methods) {
      setErrorMessage("Please wait for wallet connection to complete...");
    } else {
      setErrorMessage("");
      checkUsdtBalance();
      const usdtAddress = process.env.REACT_APP_USDT_CONTRACT_ADDRESS;
      setSwapUrl(`https://pancakeswap.finance/swap?outputCurrency=${usdtAddress}`);
    }
  }, [contract, checkUsdtBalance]);

  useEffect(() => {
    checkUsdtBalance();
  }, [donationAmount, checkUsdtBalance]);

  useEffect(() => {
    if (referralAddress) {
      setSponsorAddress(referralAddress);
    }
  }, [referralAddress]);

  const handleDonate = async () => {
    if (!contract || !contract.methods) {
      setErrorMessage("Please wait for wallet connection to complete and try again.");
      setShowError(true);
      return;
    }

    if (!hasAgreedToTerms) {
      setErrorMessage("Please review and agree to the membership application terms before proceeding.");
      setShowError(true);
      return;
    }

    if (!hasEnoughBalance) {
      setErrorMessage("Insufficient USDT balance");
      setShowError(true);
      return;
    }

    setPendingTransaction({
      type: 'donate',
      details: {
        amount: donationAmount,
        sponsor: sponsorAddress,
        feePercent: 3,
        totalAmount: calculateTotals().totalUsd
      }
    });
    setShowConfirm(true);
  };

  const proceedWithDonation = async () => {
    try {
      if (!contract || !contract.methods) {
        throw new Error("Contract not initialized. Please wait for wallet connection to complete.");
      }

      setIsLoading(true);
      setErrorMessage("");
      
      const web3 = new Web3(window.ethereum);
      if (!web3.utils.isAddress(sponsorAddress)) {
        setErrorMessage("Invalid sponsor wallet address.");
        setShowError(true);
        return;
      }

      const accounts = await web3.eth.getAccounts();
      const userAccount = accounts[0];

      // Calculate amounts in USDT decimals (6 decimals)
      const baseAmount = (donationAmount * 10**18).toFixed(0);  // Remove any decimals
      const totalAmount = (donationAmount * 1.03 * 10**18).toFixed(0); // Include 3% fee

      if (!usdtContract || !usdtContract.methods) {
        throw new Error("USDT contract not initialized. Please wait for wallet connection to complete.");
      }

      // Approve USDT transfer with the exact amount needed
      await usdtContract.methods.approve(contractAddress, totalAmount)
        .send({ from: userAccount });

      // Make donation with the base amount
      const tx = await contract.methods
        .donate(baseAmount, sponsorAddress, plan.id)
        .send({ from: userAccount });

      await refreshDashboard();
      setSuccessPopup({
        message: "Membership successful! Your membership has been initiated.",
        txHash: tx.transactionHash
      });
      setShowConfirm(false); // Only close confirmation after success
      onClose();
    } catch (error) {
      console.error("Membership failed:", error);
      setErrorMessage(error.message || "Transaction failed");
      setShowError(true);
      setShowConfirm(false); // Close confirmation on error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="popup-container">
      <div className="popup">
        <h2>{plan.name}</h2>

        <div className="balance-display">
          <p><strong>Your USDT Balance:</strong> ${usdtBalance.toFixed(2)}</p>
          {!hasEnoughBalance && (
            <div className="swap-link">
              <p>Need USDT?</p>
              <a 
                href={swapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="swap-button"
              >
                Swap on PancakeSwap
              </a>
            </div>
          )}
        </div>

        <div className="popup-content-wrapper">
          <div className="input-section">
            <div className="popup-field">
              <label>Sponsor Wallet Address:</label>
              <input
                type="text"
                className="sponsor-input"
                value={sponsorAddress}
                onChange={(e) => setSponsorAddress(e.target.value)}
                placeholder="Enter sponsor wallet address"
              />
            </div>

            <div className="popup-field">
              <label>Select Membership Amount:</label>
              <div className="radio-buttons">
                <label>
                  <input
                    type="radio"
                    name="donationAmount"
                    value={100}
                    checked={donationAmount === 100}
                    onChange={() => setDonationAmount(100)}
                  />
                  $100
                </label>
                <label>
                  <input
                    type="radio"
                    name="donationAmount"
                    value={500}
                    checked={donationAmount === 500}
                    onChange={() => setDonationAmount(500)}
                  />
                  $500
                </label>
                <label>
                  <input
                    type="radio"
                    name="donationAmount"
                    value={1000}
                    checked={donationAmount === 1000}
                    onChange={() => setDonationAmount(1000)}
                  />
                  $1000
                </label>
              </div>
            </div>
          </div>

          <div className="popup-details">
            <h3>Transaction Summary</h3>
            <div className="summary-grid">
              <p>Membership Amount: <span>${donationAmount}</span></p>
              <p>Deposit Fee (3%): <span>${calculateTotals().depositFee.toFixed(2)}</span></p>
              <p>Total USD: <span>${calculateTotals().totalUsd.toFixed(2)}</span></p>
            </div>
          </div>
        </div>

        {errorMessage && <p className="error-message">{errorMessage}</p>}

        <div className="terms-footer">
          <p>By proceeding with this package, you agree to become a member of TWPN. Please review the following documents:</p>
          <div className="document-links">
            <a href="/assets/TWPN Membership Application.docx.pdf" target="_blank" rel="noopener noreferrer">Membership Application</a>
            <a href="/assets/TWPN Charter Bylaws.docx.pdf" target="_blank" rel="noopener noreferrer">Charter & Bylaws</a>
            <a href="/assets/TWPN Articles of Association.docx.pdf" target="_blank" rel="noopener noreferrer">Articles of Association</a>
          </div>
          <div className="agreement-checkbox">
            <input
              type="checkbox"
              id="termsAgreement"
              checked={hasAgreedToTerms}
              onChange={(e) => setHasAgreedToTerms(e.target.checked)}
            />
            <label htmlFor="termsAgreement">
              I have reviewed and agree to the terms in the membership application
            </label>
          </div>
        </div>

        <div className="popup-actions">
          <button 
            onClick={handleDonate} 
            disabled={isLoading || !hasEnoughBalance}
            className={`${isLoading ? 'loading' : ''} ${!hasEnoughBalance ? 'insufficient-balance' : ''}`}
          >
            {isLoading ? 'Processing...' : hasEnoughBalance ? 'Purchase Membership' : 'Insufficient Balance'}
          </button>
          <button onClick={onClose} disabled={isLoading}>Cancel</button>
        </div>
      </div>

      {showConfirm && (
        <TransactionConfirmPopup
          type={pendingTransaction.type}
          details={pendingTransaction.details}
          contractAddress={contractAddress}
          onConfirm={proceedWithDonation}
          onCancel={() => {
            setShowConfirm(false);
            setPendingTransaction(null);
          }}
        />
      )}

      {showError && (
        <ErrorPopup
          message={errorMessage}
          onClose={() => setShowError(false)}
        />
      )}
    </div>
  );
};

export default DonationPopup;
