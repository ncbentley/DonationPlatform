import React from 'react';
import './TransactionConfirmPopup.css';

const TransactionConfirmPopup = ({ type, details, contractAddress, onConfirm, onCancel }) => {
  const renderTransactionDetails = () => {
    if (type === 'donate') {
      return (
        <div className="transaction-details">
          <h3>Transaction Steps:</h3>
          <ol className="transaction-steps">
            <li>
              Approve the contract to spend ${details.totalAmount.toFixed(2)} USDT
              <div className="step-details">
                This allows the contract to transfer the donation amount plus fee from your wallet
              </div>
            </li>
            <li>
              Call the contract's donate function with ${details.amount} USDT
              <div className="step-details">
                This starts your donation plan and registers your sponsor ({details.sponsor})
              </div>
            </li>
          </ol>

          <div className="summary-section">
            <h3>Transaction Summary</h3>
            <div className="summary-grid">
              <div className="summary-item">
                <div className="summary-label">Donation Amount:</div>
                <div className="summary-value">${details.amount}</div>
              </div>
              <div className="summary-item">
                <div className="summary-label">Fee ({details.feePercent}%):</div>
                <div className="summary-value">${(details.totalAmount - details.amount).toFixed(2)}</div>
              </div>
              <div className="summary-item">
                <div className="summary-label">Total USDT:</div>
                <div className="summary-value">${details.totalAmount.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>
      );
    }
    // Add other transaction types here if needed
    return null;
  };

  return (
    <div className="confirm-popup-container">
      <div className="confirm-popup">
        <h2>Confirm Transaction</h2>
        {renderTransactionDetails()}
        <div className="confirm-actions">
          <button onClick={onConfirm} className="confirm-button">Confirm</button>
          <button onClick={onCancel} className="cancel-button">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default TransactionConfirmPopup; 