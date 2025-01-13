import React, { useState, useEffect } from 'react';
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
  contract,
  wallet
}) => {
  const [activeTab, setActiveTab] = useState('membership');
  const hasActivePlan = myDonation > 0 && myDonationPlan > 0;
  const actualTotalDonated = totalDonated;

  // If user loses their active plan, switch back to membership tab
  useEffect(() => {
    if (!hasActivePlan && activeTab === 'referral') {
      setActiveTab('membership');
    }
  }, [hasActivePlan, activeTab]);

  const renderContent = () => {
    if (activeTab === 'membership') {
      return (
        <>
          <div className="summary-section">
            <div className="summary-card">
              <h3>Total Sales</h3>
              <p>${(15300 + actualTotalDonated).toLocaleString()}</p>
            </div>
            <div className="summary-card">
              <h3>Total Rewards Paid</h3>
              <p>${totalPaidOut.toLocaleString()}</p>
            </div>
          </div>

          {hasActivePlan ? (
            <>
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
              {myDonation >= 1000 && (
                <div className="premium-link-section">
                  <h3>Premium Member Access</h3>
                  <a 
                    href="https://t.me/+-37sTnfSVG4wNDIx" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="premium-link"
                  >
                    Access Exclusive Live Trading Sessions with Kelli
                  </a>
                </div>
              )}
            </>
          ) : (
            <DonationPlans 
              onSelectPlan={setSelectedPlan}
            />
          )}
        </>
      );
    } else {
      return (
        <ReferrerSection
          isReferrer={isReferrer}
          handleActivateReferrer={handleActivateReferrer}
          contract={contract}
          wallet={wallet}
        />
      );
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="tab-buttons">
          <button 
            className={`tab-button ${activeTab === 'membership' ? 'active' : ''}`}
            onClick={() => setActiveTab('membership')}
          >
            Membership Details
          </button>
          {hasActivePlan && (
            <button 
              className={`tab-button ${activeTab === 'referral' ? 'active' : ''}`}
              onClick={() => setActiveTab('referral')}
            >
              Referral Dashboard
            </button>
          )}
        </div>
      </div>
      
      <div className="dashboard-content">
        {renderContent()}
      </div>
    </div>
  );
};

export default Dashboard;
