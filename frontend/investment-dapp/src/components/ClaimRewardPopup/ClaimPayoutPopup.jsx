import React, { useState } from "react";
import "./ClaimPayoutPopup.css";

const ClaimPayoutPopup = ({ payoutAmount, onClose, onClaim }) => {
  const [charityPercentage, setCharityPercentage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  const handleClaim = async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");
      await onClaim(charityPercentage);
      onClose();
    } catch (error) {
      console.error("Failed to claim:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateFinalPayout = () => {
    const withdrawalFee = (payoutAmount * 5) / 100; // 5% fee
    const charityAmount = (payoutAmount * charityPercentage) / 100;
    return payoutAmount - withdrawalFee - charityAmount;
  };

  return (
    <div className="popup-container">
      <div className="popup">
        <h2>Claim Payout</h2>
        <div className="popup-content">
          <div className="payout-details">
            <p><strong>Available Payout:</strong> ${payoutAmount.toLocaleString()}</p>
            <p><strong>Withdrawal Fee (5%):</strong> ${(payoutAmount * 0.05).toLocaleString()}</p>
          </div>

          <div className="charity-section">
            <h3>Donate to Charity</h3>
            <p>Choose percentage to donate:</p>
            <div className="charity-options">
              <button 
                className={charityPercentage === 0 ? "selected" : ""}
                onClick={() => {
                  setCharityPercentage(0);
                  setShowCustomInput(false);
                }}
              >
                0%
              </button>
              <button 
                className={charityPercentage === 10 ? "selected" : ""}
                onClick={() => {
                  setCharityPercentage(10);
                  setShowCustomInput(false);
                }}
              >
                10%
              </button>
              <button 
                className={charityPercentage === 25 ? "selected" : ""}
                onClick={() => {
                  setCharityPercentage(25);
                  setShowCustomInput(false);
                }}
              >
                25%
              </button>
              <button 
                className={showCustomInput ? "selected" : ""}
                onClick={() => setShowCustomInput(true)}
              >
                Custom
              </button>
            </div>

            {showCustomInput && (
              <div className="custom-percentage">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={charityPercentage}
                  onChange={(e) => setCharityPercentage(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                />
                <span>%</span>
              </div>
            )}

            {charityPercentage > 0 && (
              <p className="charity-amount">
                Charity Donation: ${((payoutAmount * charityPercentage) / 100).toLocaleString()}
              </p>
            )}

            <p className="final-payout">
              <strong>Final Payout:</strong> ${calculateFinalPayout().toLocaleString()}
            </p>
          </div>
        </div>

        {errorMessage && <p className="error-message">{errorMessage}</p>}

        <div className="popup-actions">
          <button 
            onClick={handleClaim} 
            disabled={isLoading}
            className={isLoading ? 'loading' : ''}
          >
            {isLoading ? 'Processing...' : 'Claim Payout'}
          </button>
          <button onClick={onClose} disabled={isLoading}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default ClaimPayoutPopup; 