import React, { useState, useEffect } from 'react';
import './ReferrerSection.css';
import ErrorPopup from '../ErrorPopup/ErrorPopup';
import TransactionConfirmPopup from '../TransactionConfirmPopup/TransactionConfirmPopup';

const ReferrerSection = ({ isReferrer, handleActivateReferrer, contract }) => {
  const [copySuccess, setCopySuccess] = useState(false);
  const [referrerFee, setReferrerFee] = useState(0);
  const [commissionsEarned, setCommissionsEarned] = useState(0);
  const [commissionsPaid, setCommissionsPaid] = useState(0);
  const [claimableCommission, setClaimableCommission] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [showError, setShowError] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingTransaction, setPendingTransaction] = useState(null);
  const [referralTree, setReferralTree] = useState(null);
  const [loadingTree, setLoadingTree] = useState(false);
  const [donorCache, setDonorCache] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    const fetchReferrerData = async () => {
      if (contract && contract.methods) {
        try {
          const fee = await contract.methods.referrerFeeUsd().call();
          setReferrerFee(parseInt(fee) / 10**18);

          if (isReferrer) {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const userAddress = accounts[0];
            
            const { earned, paid } = await contract.methods.getCommissionDetails(userAddress).call();
            const claimable = earned - paid;
            setCommissionsEarned(parseInt(earned) / 10**18);
            setCommissionsPaid(parseInt(paid) / 10**18);
            setClaimableCommission(parseInt(claimable) / 10**18);
          }
        } catch (error) {
          console.error('Failed to fetch referrer data:', error);
        }
      }
    };
    fetchReferrerData();
  }, [contract, isReferrer]);

  const handleClaimCommission = async () => {
    if (!contract || !contract.methods) return;
    
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      await contract.methods.claimCommission().send({ from: accounts[0] });
      // Refresh the data after claiming
      const claimable = await contract.methods.claimableCommission(accounts[0]).call();
      const paid = await contract.methods.totalCommissionPaid(accounts[0]).call();
      setClaimableCommission(parseInt(claimable) / 10**18);
      setCommissionsPaid(parseInt(paid) / 10**18);
    } catch (error) {
      console.error('Failed to claim commission:', error);
      setErrorMessage(error.message || 'Failed to claim commission');
      setShowError(true);
    }
  };

  const handleActivateReferrerWithError = async () => {
    try {
      setPendingTransaction({
        type: 'activateReferrer',
        details: {
          amount: referrerFee,
          totalAmount: referrerFee
        }
      });
      setShowConfirm(true);
    } catch (error) {
      console.error('Failed to activate referrer:', error);
      setErrorMessage(error.message || 'Failed to activate referrer');
      setShowError(true);
    }
  };

  const proceedWithActivation = async () => {
    try {
      await handleActivateReferrer();
      setShowConfirm(false);
    } catch (error) {
      console.error('Failed to activate referrer:', error);
      setErrorMessage(error.message || 'Failed to activate referrer');
      setShowError(true);
      setShowConfirm(false);
    }
  };

  const handleCopyReferralLink = async () => {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const userAddress = accounts[0];
    const referralLink = `${window.location.origin}${window.location.pathname}?ref=${userAddress}`;
    
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const initializeDonorCache = async () => {
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
            rewardsReceived: parseInt(userDetails.totalWithdrawn) / 10**18
          });
          
          if (count % 10 === 0) {
            setLoadingProgress(count);
          }
          
          count++;
        } catch {
          break;
        }
      }
      
      return donors;
    } catch (error) {
      return null;
    }
  };

  const fetchReferralTree = async (address, level = 0, maxLevel = 4, cache = null) => {
    if (level >= maxLevel) {
      return null;
    }
    
    try {
      const donors = cache || donorCache;
      
      if (!donors) {
        return null;
      }
      
      const directReferrals = donors
        .filter(donor => donor.sponsor.toLowerCase() === address.toLowerCase())
        .map(async (donor) => {
          const childReferrals = await fetchReferralTree(donor.address, level + 1, maxLevel, donors);
          
          return {
            address: donor.address,
            donation: donor.donation,
            isReferrer: donor.isReferrer,
            rewardsReceived: donor.rewardsReceived,
            children: childReferrals || []
          };
        });

      const resolvedReferrals = await Promise.all(directReferrals);
      return resolvedReferrals;
    } catch (error) {
      return null;
    }
  };

  useEffect(() => {
    const loadReferralTree = async () => {
      if (contract && isReferrer) {
        setLoadingTree(true);
        
        try {
          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          const userAddress = accounts[0];
          
          const cache = await initializeDonorCache();
          setDonorCache(cache);
          
          if (!cache) {
            throw new Error('Failed to initialize donor cache');
          }
          
          const tree = await fetchReferralTree(userAddress, 0, 4, cache);
          setReferralTree(tree);
        } catch (error) {
          setErrorMessage(error.message || 'Failed to load referral tree');
          setShowError(true);
        }
        setLoadingTree(false);
      }
    };

    loadReferralTree();
  }, [contract, isReferrer]);

  const renderReferralTree = (nodes, level = 0) => {
    if (!nodes || nodes.length === 0) return null;

    return (
      <ul className={`referral-level-${level}`}>
        {nodes.map((node, index) => (
          <li key={node.address} className="referral-node">
            <div className="referral-info">
              <div className="address">
                {node.address.slice(0, 6)}...{node.address.slice(-4)}
              </div>
              <div className="stats">
                <span>Donation: ${node.donation.toFixed(2)}</span>
                <span>Earned: ${node.rewardsReceived.toFixed(2)}</span>
                {node.isReferrer && <span className="referrer-badge">Referrer</span>}
              </div>
            </div>
            {renderReferralTree(node.children, level + 1)}
          </li>
        ))}
      </ul>
    );
  };

  const referralTreeSection = (
    <div className="referral-tree-section">
      <h3>Your Referral Network</h3>
      {loadingTree ? (
        <div className="loading-tree">
          <div>Loading referral network...</div>
          {loadingProgress > 0 && (
            <div className="loading-progress">
              Cached {loadingProgress} donors
            </div>
          )}
        </div>
      ) : referralTree ? (
        <div className="referral-tree">
          {renderReferralTree(referralTree)}
        </div>
      ) : (
        <p>No referrals found</p>
      )}
    </div>
  );

  if (!isReferrer) {
    return (
      <div className="referrer-activation-section">
        <div className="referrer-info-card">
          <h2>ACTIVATE REFERRAL LINK</h2>
          <div className="fee-display">
            <span className="fee-amount">${referrerFee}</span>
            <span className="fee-label">Activation Fee</span>
          </div>
          <p>Activate your referral link to start earning commissions from referrals.</p>
          <button onClick={handleActivateReferrerWithError} className="activate-button">
            ACTIVATE REFERRAL LINK
          </button>
        </div>
        {showError && (
          <ErrorPopup
            message={errorMessage}
            onClose={() => setShowError(false)}
          />
        )}
        {showConfirm && (
          <TransactionConfirmPopup
            type="activateReferrer"
            details={pendingTransaction.details}
            onConfirm={proceedWithActivation}
            onCancel={() => {
              setShowConfirm(false);
              setPendingTransaction(null);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="referrer-info-section">
      <h2>Your Referral Dashboard</h2>
      
      <div className="referral-link-input-group">
        <input
          type="text"
          readOnly
          value={`${window.location.origin}${window.location.pathname}?ref=${window.ethereum?.selectedAddress || ''}`}
          className="referral-link-input"
        />
        <button 
          onClick={handleCopyReferralLink}
          className={`copy-button ${copySuccess ? 'success' : ''}`}
        >
          {copySuccess ? 'Copied!' : 'Copy'}
        </button>
      </div>
      
      <div className="commission-stats">
        <div className="commission-stat-card">
          <h3>Total Commissions Earned</h3>
          <p>${commissionsEarned.toLocaleString()}</p>
        </div>
        <div className="commission-stat-card">
          <h3>Total Commissions Paid</h3>
          <p>${commissionsPaid.toLocaleString()}</p>
        </div>
        <div className="commission-stat-card">
          <h3>Claimable Commission</h3>
          <p>${claimableCommission.toLocaleString()}</p>
          {claimableCommission > 0 && (
            <button onClick={handleClaimCommission} className="claim-button">
              CLAIM COMMISSION
            </button>
          )}
        </div>
      </div>
      {showError && (
        <ErrorPopup
          message={errorMessage}
          onClose={() => setShowError(false)}
        />
      )}
      {isReferrer && referralTreeSection}
    </div>
  );
};

export default ReferrerSection;
