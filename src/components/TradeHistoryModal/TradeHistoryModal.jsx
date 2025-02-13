import React from 'react';
import './TradeHistoryModal.css';
import trade1 from '../../assets/trades1.jpg';
import trade2 from '../../assets/trades2.jpg';

const TradeHistoryModal = ({ onClose }) => {
  return (
    <div className="popup-container">
      <div className="popup trade-history-popup">
        <div className="popup-header">
          <h2>Recent Trade History</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>
        <div className="trade-history-content">
          <img src={trade1} alt="Trade History 1" />
          <img src={trade2} alt="Trade History 2" />
        </div>
      </div>
    </div>
  );
};

export default TradeHistoryModal; 