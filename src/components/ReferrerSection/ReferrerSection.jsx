import React, { useState, useEffect } from 'react';
import './ReferrerSection.css';
import ErrorPopup from '../ErrorPopup/ErrorPopup';
import TransactionConfirmPopup from '../TransactionConfirmPopup/TransactionConfirmPopup';

const ReferrerSection = ({ isReferrer, handleActivateReferrer, contract }) => {
  const [copySuccess, setCopySuccess] = useState(false);
  const [referrerFee, setReferrerFee] = useState(0);
  const [commissionsEarned, setCommissionsEarned] = useState(0);
  const [commissionsPaid, setCommissionsPaid] = useState(0);
  const [claimableCommission, setClaimableCommission] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [showError, setShowError] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingTransaction, setPendingTransaction] = useState(null);

  useEffect(() => {
    const fetchReferrerData = async () => {
      if (contract && contract.methods) {
        try {
          const fee = await contract.methods.referrerFeeUsd().call();
          setReferrerFee(parseInt(fee) / 10**18);

          if (isReferrer) {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const userAddress = accounts[0];
            
            const { earned, paid } = await contract.methods.getCommissionDetails(userAddress).call();
            const claimable = earned - paid;
            setCommissionsEarned(parseInt(earned) / 10**18);
            setCommissionsPaid(parseInt(paid) / 10**18);
            setClaimableCommission(parseInt(claimable) / 10**18);
          }
        } catch (error) {
          console.error('Failed to fetch referrer data:', error);
        }
      }
    };
    fetchReferrerData();
  }, [contract, isReferrer]);

  const handleClaimCommission = async () => {
    if (!contract || !contract.methods) return;
    
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      await contract.methods.claimCommission().send({ from: accounts[0] });
      // Refresh the data after claiming
      const claimable = await contract.methods.claimableCommission(accounts[0]).call();
      const paid = await contract.methods.totalCommissionPaid(accounts[0]).call();
      setClaimableCommission(parseInt(claimable) / 10**18);
      setCommissionsPaid(parseInt(paid) / 10**18);
    } catch (error) {
      console.error('Failed to claim commission:', error);
      setErrorMessage(error.message || 'Failed to claim commission');
      setShowError(true);
    }
  };

  const handleActivateReferrerWithError = async () => {
    try {
      setPendingTransaction({
        type: 'activateReferrer',
        details: {
          amount: referrerFee,
          totalAmount: referrerFee
        }
      });
      setShowConfirm(true);
    } catch (error) {
      console.error('Failed to activate referrer:', error);
      setErrorMessage(error.message || 'Failed to activate referrer');
      setShowError(true);
    }
  };

  const proceedWithActivation = async () => {
    try {
      await handleActivateReferrer();
      setShowConfirm(false);
    } catch (error) {
      console.error('Failed to activate referrer:', error);
      setErrorMessage(error.message || 'Failed to activate referrer');
      setShowError(true);
      setShowConfirm(false);
    }
  };

  const handleCopyReferralLink = async () => {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const userAddress = accounts[0];
    const referralLink = `${window.location.origin}${window.location.pathname}?ref=${userAddress}`;
    
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  if (!isReferrer) {
    return (
      <div className="referrer-activation-section">
        <div className="referrer-info-card">
          <h2>ACTIVATE REFERRAL LINK</h2>
          <div className="fee-display">
            <span className="fee-amount">${referrerFee}</span>
            <span className="fee-label">Activation Fee</span>
          </div>
          <p>Activate your referral link to start earning commissions from referrals.</p>
          <button onClick={handleActivateReferrerWithError} className="activate-button">
            ACTIVATE REFERRAL LINK
          </button>
        </div>
        {showError && (
          <ErrorPopup
            message={errorMessage}
            onClose={() => setShowError(false)}
          />
        )}
        {showConfirm && (
          <TransactionConfirmPopup
            type="activateReferrer"
            details={pendingTransaction.details}
            onConfirm={proceedWithActivation}
            onCancel={() => {
              setShowConfirm(false);
              setPendingTransaction(null);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="referrer-info-section">
      <h2>Your Referral Dashboard</h2>
      
      <div className="referral-link-input-group">
        <input
          type="text"
          readOnly
          value={`${window.location.origin}${window.location.pathname}?ref=${window.ethereum?.selectedAddress || ''}`}
          className="referral-link-input"
        />
        <button 
          onClick={handleCopyReferralLink}
          className={`copy-button ${copySuccess ? 'success' : ''}`}
        >
          {copySuccess ? 'Copied!' : 'Copy'}
        </button>
      </div>
      
      <div className="commission-stats">
        <div className="commission-stat-card">
          <h3>Total Commissions Earned</h3>
          <p>${commissionsEarned.toLocaleString()}</p>
        </div>
        <div className="commission-stat-card">
          <h3>Total Commissions Paid</h3>
          <p>${commissionsPaid.toLocaleString()}</p>
        </div>
        <div className="commission-stat-card">
          <h3>Claimable Commission</h3>
          <p>${claimableCommission.toLocaleString()}</p>
          {claimableCommission > 0 && (
            <button onClick={handleClaimCommission} className="claim-button">
              CLAIM COMMISSION
            </button>
          )}
        </div>
      </div>
      {showError && (
        <ErrorPopup
          message={errorMessage}
          onClose={() => setShowError(false)}
        />
      )}
    </div>
  );
};

export default ReferrerSection;
