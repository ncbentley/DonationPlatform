import React, { useEffect, useState } from 'react';
import './UserDonation.css';

const UserDonation = ({
  myDonation,
  myDonationPlan,
  nextRewardDate,
  nextRewardAmount,
  isReferrer,
  setShowClaimRewardPopup,
  contract
}) => {
  const [timeDisplay, setTimeDisplay] = useState({
    text: '',
    isUrgent: false
  });

  useEffect(() => {
    if (!nextRewardDate) return;

    const updateDisplay = () => {
      setTimeDisplay(formatTimeRemaining(nextRewardDate));
    };

    updateDisplay();
    const interval = setInterval(updateDisplay, 1000);

    return () => clearInterval(interval);
  }, [nextRewardDate]);

  const getTotalReturn = (plan, amount) => {
    if (plan === 4) {
      // 870% total return
      return amount * 8.7;
    } else if (plan === 6) {
      // 1230% total return
      return amount * 12.3;
    } else if (plan === 12) {
      // 1590% total return
      return amount * 15.9;
    }
    return 0;
  };

  const getRewardSchedule = (plan, amount) => {
    // 4-month plan
    if (plan === 4) {
      return (
        <>
          <p>• First 3 rewards: ${(amount * 0.5).toLocaleString()} every 120 days</p>
          <p>• Then ${(amount * 0.3).toLocaleString()} every 30 days for 24 rewards</p>
          <p>• Total benefits: ${(amount * 8.7).toLocaleString()} over 3 years</p>
        </>
      );
    }
    // 6-month plan
    else if (plan === 6) {
      return (
        <>
          <p>• First 2 rewards: ${(amount * 0.75).toLocaleString()} every 180 days</p>
          <p>• Then ${(amount * 0.45).toLocaleString()} every 30 days for 24 rewards</p>
          <p>• Total benefits: ${(amount * 12.3).toLocaleString()} over 3 years</p>
        </>
      );
    }
    // 12-month plan
    else if (plan === 12) {
      return (
        <>
          <p>• First reward: ${(amount * 1.5).toLocaleString()} after 360 days</p>
          <p>• Then ${(amount * 0.6).toLocaleString()} every 30 days for 24 rewards</p>
          <p>• Total benefits: ${(amount * 15.9).toLocaleString()} over 3 years</p>
        </>
      );
    }
    return null;
  };

  const formatTimeRemaining = (dueDate) => {
    const now = Date.now();
    
    // If reward is available, return ready state
    if (dueDate <= now) {
      return {
        text: 'Ready to claim',
        isUrgent: true
      };
    }

    const timeRemaining = dueDate - now;
    const seconds = Math.floor(timeRemaining / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    const isUrgent = minutes < 5;

    if (days >= 3) {
      return {
        text: `Due: ${new Date(dueDate).toLocaleDateString()}`,
        isUrgent
      };
    }

    if (days > 0) {
      const remainingHours = hours % 24;
      return {
        text: `in ${days} day${days > 1 ? 's' : ''} ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`,
        isUrgent
      };
    }

    if (hours > 0) {
      const remainingMinutes = minutes % 60;
      return {
        text: `in ${hours} hour${hours > 1 ? 's' : ''}, ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`,
        isUrgent
      };
    }

    const remainingSeconds = seconds % 60;
    return {
      text: `in ${minutes} minute${minutes !== 1 ? 's' : ''}, ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`,
      isUrgent
    };
  };

  return (
    <div className="user-info-section">
      <h2>Your Membership Details</h2>
      <div className="donation-cards">
        <div className="donation-card">
          <div className="card-header">
            <h3>Membership Amount</h3>
            <div className="amount-display">
              <span className="amount">${myDonation.toLocaleString()}</span>
              <span className="plan">{myDonationPlan} Month Plan</span>
              <span className="total-return">Total Benefits: ${getTotalReturn(myDonationPlan, myDonation).toLocaleString()}</span>
            </div>
          </div>
          <div className="card-content">
            <h4>Reward Schedule</h4>
            <div className="schedule-details">
              {getRewardSchedule(myDonationPlan, myDonation)}
            </div>
          </div>
        </div>

        <div className="donation-card">
          <div className="card-header">
            <h3>Next Reward</h3>
            {nextRewardDate ? (
              <div className="amount-display">
                <span className="amount">${nextRewardAmount.toLocaleString()}</span>
                <span className={`date ${timeDisplay.isUrgent ? 'urgent' : ''} ${nextRewardDate <= Date.now() ? 'ready' : ''}`}>
                  {timeDisplay.text}
                </span>
              </div>
            ) : (
              <span className="no-reward">No more rewards available</span>
            )}
          </div>
          <div className="card-content">
            {nextRewardDate && (
              <button 
                onClick={() => nextRewardDate <= Date.now() && setShowClaimRewardPopup(true)}
                className={`claim-button ${nextRewardDate > Date.now() ? 'not-ready' : ''} ${timeDisplay.isUrgent ? 'urgent' : ''}`}
                disabled={nextRewardDate > Date.now()}
              >
                <span>Claim Reward</span>
              </button>
            )}
            <div className="total-withdrawn">
              <h4>Total Withdrawn</h4>
              <p className="withdrawn-amount">$0</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDonation; 