import React from 'react';
import './Dashboard.css';
import UserDonation from '../UserDonation/UserDonation';
import DonationPlans from '../DonationPlans/DonationPlans';
import ReferrerSection from '../ReferrerSection/ReferrerSection';

const DONATION_LIMIT = 10000000; // $10 million limit

const Dashboard = ({ 
  totalDonated, 
  totalPaidOut, 
  myDonation, 
  myDonationPlan,
  nextRewardDate,
  nextRewardAmount,
  isReferrer,
  handleActivateReferrer,
  setShowClaimRewardPopup,
  setSelectedPlan,
  contract
}) => {
  const hasActivePlan = myDonation > 0 && myDonationPlan > 0;
  const actualTotalDonated = 15300 + totalDonated;
  const remainingDonations = DONATION_LIMIT - actualTotalDonated;
  const progressPercentage = (actualTotalDonated / DONATION_LIMIT) * 100;
  
  const getUrgencyMessage = () => {
    if (progressPercentage >= 95) {
      return "🚨 Final chance! Less than 5% of donation capacity remaining";
    } else if (progressPercentage >= 90) {
      return "⚡️ Urgent: Less than 10% of donation capacity remaining";
    } else if (progressPercentage >= 75) {
      return "🔥 Limited capacity: Donation limit filling up fast";
    } else if (progressPercentage >= 50) {
      return "📈 Over 50% of donation capacity filled";
    }
    return null;
  };

  const urgencyMessage = getUrgencyMessage();
  const urgencyLevel = progressPercentage >= 90 ? 'high' : 
                      progressPercentage >= 75 ? 'medium' : 
                      progressPercentage >= 50 ? 'low' : '';

  return (
    <div className="dashboard">
      {/* <div className="donation-limit-section">
        <div className="donation-limit-info">
          <h3>Total Donation Capacity</h3>
          <div className="progress-container">
            <div 
              className={`progress-bar ${urgencyLevel}`}
              style={{ width: `${progressPercentage}%` }}
            >
              <span className="progress-text">
                ${actualTotalDonated.toLocaleString()} / ${DONATION_LIMIT.toLocaleString()}
              </span>
            </div>
          </div>
          {urgencyMessage && (
            <div className={`urgency-message ${urgencyLevel}`}>
              {urgencyMessage}
            </div>
          )}
          <div className="remaining-amount">
            Remaining Capacity: ${remainingDonations.toLocaleString()}
          </div>
        </div>
      </div> */}

      <div className="summary-section">
        <div className="summary-card">
          <h3>Total Donations</h3>
          <p>${(15300 + totalDonated).toLocaleString()}</p>
        </div>
        <div className="summary-card">
          <h3>Total Rewards Paid</h3>
          <p>${totalPaidOut.toLocaleString()}</p>
        </div>
      </div>

      {hasActivePlan ? (
        <UserDonation 
          myDonation={myDonation}
          myDonationPlan={myDonationPlan}
          nextRewardDate={nextRewardDate}
          nextRewardAmount={nextRewardAmount}
          isReferrer={isReferrer}
          handleActivateReferrer={handleActivateReferrer}
          setShowClaimRewardPopup={setShowClaimRewardPopup}
          contract={contract}
        />
      ) : (
        <DonationPlans 
          onSelectPlan={setSelectedPlan}
        />
      )}

      {hasActivePlan && (
        <ReferrerSection 
          isReferrer={isReferrer}
          handleActivateReferrer={handleActivateReferrer}
          contract={contract}
        />
      )}
    </div>
  );
};

export default Dashboard;
