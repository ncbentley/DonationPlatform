import React from "react";

const ConfirmationPopup = ({ transactionHash, onClose, refreshDashboard }) => {
  return (
    <div className="popup-container">
      <div className="popup">
        <h2>Investment Successful</h2>
        <p>Your investment has been successfully submitted.</p>
        <p>
          <strong>Transaction Hash:</strong> 
          <a href={`https://testnet.bscscan.com/tx/${transactionHash}`} target="_blank" rel="noopener noreferrer">
            {transactionHash}
          </a>
        </p>
        <div className="popup-actions">
          <button onClick={() => { onClose(); refreshDashboard(); }}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationPopup;
