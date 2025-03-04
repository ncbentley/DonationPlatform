import React from 'react';
import './WelcomePopup.css';

const WelcomePopup = ({ onClose }) => {
  return (
    <div className="popup-container">
      <div className="popup welcome-popup">
        <div className="popup-header">
          <h2>Important Notice</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>
        <div className="welcome-content">
          <p className="notice-text">We are remaining open for new registrations.</p>
          <p className="meeting-info">Please join our upcoming meeting:</p>
          <div className="meeting-details">
            <p><strong>Date:</strong> Thursday, March 6th</p>
            <p><strong>Time:</strong> 8:00 PM EST</p>
          </div>
          <a 
            href="https://us06web.zoom.us/j/82425741383?pwd=bi1sUxueOHXo3mYRuXLXxN7jq4HbwH.1" 
            target="_blank" 
            rel="noopener noreferrer"
            className="zoom-button"
          >
            Join Zoom Meeting
          </a>
        </div>
      </div>
    </div>
  );
};

export default WelcomePopup; 