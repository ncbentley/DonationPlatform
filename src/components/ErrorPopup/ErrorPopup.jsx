import React from 'react';
import './ErrorPopup.css';

const ErrorPopup = ({ message, onClose }) => {
  return (
    <div className="popup-container">
      <div className="error-popup">
        <div className="error-icon">⚠️</div>
        <h2>Error</h2>
        <div className="error-message">
          {message}
        </div>
        <div className="popup-actions">
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default ErrorPopup; 