import React from 'react';
import './Dashboard.css';
import UserDonation from '../UserDonation/UserDonation';
import DonationPlans from '../DonationPlans/DonationPlans';
import ReferrerSection from '../ReferrerSection/ReferrerSection';

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

  return (
    <div className="dashboard">
      <div className="summary-section">
        <div className="summary-card">
          <h3>Total Donations</h3>
          <p>${totalDonated.toLocaleString()}</p>
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
