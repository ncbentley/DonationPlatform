import React, { useState } from 'react';
import './ClaimCommissionPopup.css';

const ClaimCommissionPopup = ({ amount, onClose, onClaim }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleClaim = async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");
      await onClaim();
      onClose();
    } catch (error) {
      console.error("Failed to claim commission:", error);
      setErrorMessage(error.message || "Failed to claim commission. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate fee in USDT
  const withdrawalFee = (amount * 5) / 100; // 5% fee
  const finalAmount = amount - withdrawalFee;

  return (
    <div className="popup-container">
      <div className="popup">
        <h2>Claim Commission</h2>
        
        <div className="popup-details">
          <div className="summary-grid">
            <p>Available Commission: <span>${amount.toLocaleString()}</span></p>
            <p>Withdrawal Fee (5%): <span>-${withdrawalFee.toLocaleString()}</span></p>
            <p className="final-amount">You Will Receive: <span>${finalAmount.toLocaleString()}</span></p>
          </div>
        </div>

        {errorMessage && (
          <div className="error-message">
            {errorMessage}
          </div>
        )}

        <div className="popup-actions">
          <button 
            onClick={handleClaim} 
            disabled={isLoading}
            className={isLoading ? 'loading' : ''}
          >
            {isLoading ? 'Processing...' : 'Claim Commission'}
          </button>
          <button onClick={onClose} disabled={isLoading}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default ClaimCommissionPopup; 