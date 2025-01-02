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
  const [donorCache, setDonorCache] = useState(null);
  const [referralTree, setReferralTree] = useState(null);
  const hasActivePlan = myDonation > 0 && myDonationPlan > 0;
  const actualTotalDonated = totalDonated;

  // If user loses their active plan, switch back to membership tab
  useEffect(() => {
    if (!hasActivePlan && activeTab === 'referral') {
      setActiveTab('membership');
    }
  }, [hasActivePlan, activeTab]);

  // Initialize donor cache when contract and wallet are available
  useEffect(() => {
    const initializeDonorCache = async () => {
      if (!contract?.methods || !wallet?.accounts?.[0]?.address || donorCache) return;

      try {
        let donors = [];
        let count = 0;
        
        while (true) {
          try {
            const donorAddress = await contract.methods.donors(count).call();
            const userData = await contract.methods.users(donorAddress).call();
            const referrerData = await contract.methods.referrers(donorAddress).call();
            const userDetails = await contract.methods.getUserDetails().call({ from: donorAddress });

            donors.push({
              address: donorAddress,
              sponsor: userData.sponsor,
              donation: parseInt(userDetails[0]) / 10**18,
              isReferrer: referrerData.isActive,
              rewardsReceived: parseInt(userDetails.totalWithdrawn) / 10**18,
              commissionsEarned: parseInt(referrerData.commissionEarned) / 10**18,
              startTime: parseInt(userDetails[2]) * 1000
            });
            
            count++;
          } catch (error) {
            break;
          }
        }
        
        setDonorCache(donors);
      } catch (error) {
        console.error('Failed to initialize member cache:', error);
      }
    };

    if (isReferrer) {
      initializeDonorCache();
    }
  }, [contract?.methods, wallet?.accounts, isReferrer, donorCache]);

  const renderContent = () => {
    if (activeTab === 'membership') {
      return (
        <>
          <div className="summary-section">
            <div className="summary-card">
              <h3>Total Membership Fees</h3>
              <p>${(15300 + actualTotalDonated).toLocaleString()}</p>
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
        </>
      );
    } else {
      return (
        <ReferrerSection 
          isReferrer={isReferrer}
          handleActivateReferrer={handleActivateReferrer}
          contract={contract}
          wallet={wallet}
          donorCache={donorCache}
          referralTree={referralTree}
          setReferralTree={setReferralTree}
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
