import React, { useState } from 'react';
import './ClaimRewardPopup.css';
import TransactionConfirmPopup from '../TransactionConfirmPopup/TransactionConfirmPopup';

const ClaimRewardPopup = ({ show, onClose, contract, account, web3, rewardAmount }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingTransaction, setPendingTransaction] = useState(null);

  const handleClaim = async () => {
    setPendingTransaction({
      type: 'claimReward',
      details: {
        amount: rewardAmount
      }
    });
    setShowConfirm(true);
  };

  const proceedWithClaim = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');

      const tx = await contract.methods
        .claimPayout()
        .send({ from: account });

      if (!tx.status) {
        throw new Error('Transaction failed');
      }

      setShowConfirm(false);
      onClose();
    } catch (error) {
      console.error('Failed to claim reward:', error);
      setErrorMessage(error.message);
      setShowConfirm(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="popup-container">
      <div className="popup">
        <h2>Claim Your Reward</h2>
        <div className="popup-content">
          <p>Available Reward: <span className="amount">${rewardAmount.toLocaleString()}</span></p>
          {errorMessage && <p className="error-message">{errorMessage}</p>}
        </div>
        <div className="popup-actions">
          <button
            onClick={handleClaim}
            disabled={isLoading}
            className={isLoading ? 'loading' : ''}
          >
            {isLoading ? 'Processing...' : 'Claim Reward'}
          </button>
          <button onClick={onClose} disabled={isLoading}>Cancel</button>
        </div>
      </div>

      {showConfirm && (
        <TransactionConfirmPopup
          type={pendingTransaction.type}
          details={pendingTransaction.details}
          onConfirm={proceedWithClaim}
          onCancel={() => {
            setShowConfirm(false);
            setPendingTransaction(null);
          }}
        />
      )}
    </div>
  );
};

export default ClaimRewardPopup; 