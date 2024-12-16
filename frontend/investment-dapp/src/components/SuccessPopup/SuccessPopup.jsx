import React from 'react';
import './SuccessPopup.css';

const SuccessPopup = ({ message, txHash, onClose }) => {
  return (
    <div className="popup-container">
      <div className="popup">
        <h2>Success!</h2>
        
        <div className="success-message">
          {message}
          {txHash && (
            <>
              <br/><br/>
              <a 
                href={`https://testnet.bscscan.com/tx/${txHash}`} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                View on BscScan
              </a>
            </>
          )}
        </div>

        <div className="popup-actions">
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default SuccessPopup; 