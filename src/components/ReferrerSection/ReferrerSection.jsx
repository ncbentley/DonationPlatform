import React, { useState, useEffect } from 'react';
import './ReferrerSection.css';
import ErrorPopup from '../ErrorPopup/ErrorPopup';
import TransactionConfirmPopup from '../TransactionConfirmPopup/TransactionConfirmPopup';

const ReferrerSection = ({ isReferrer, handleActivateReferrer, contract, account }) => {
  const [copySuccess, setCopySuccess] = useState(false);
  const [referrerFee, setReferrerFee] = useState(0);
  const [commissionsEarned, setCommissionsEarned] = useState(0);
  const [commissionsPaid, setCommissionsPaid] = useState(0);
  const [claimableCommission, setClaimableCommission] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [showError, setShowError] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingTransaction, setPendingTransaction] = useState(null);
  const [referralLink, setReferralLink] = useState('');
  const [referralTree, setReferralTree] = useState(null);
  const [loadingTree, setLoadingTree] = useState(false);
  const [donorCache, setDonorCache] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const previousAccountRef = React.useRef(null);
  const hasLoadedDataRef = React.useRef(false);

  useEffect(() => {
    if (account && account !== previousAccountRef.current) {
      previousAccountRef.current = account;
      setReferralLink(`${window.location.origin}${window.location.pathname}?ref=${account}`);
    }
  }, [account]);

  useEffect(() => {
    const fetchReferrerData = async () => {
      if (!contract?.methods || !account || hasLoadedDataRef.current) return;
      
      try {
        console.log('Fetching referrer data for account:', account);
        const fee = await contract.methods.referrerFeeUsd().call();
        setReferrerFee(parseInt(fee) / 10**18);

        if (isReferrer) {
          console.log('User is a referrer, fetching commission details');
          const { earned, paid } = await contract.methods.getCommissionDetails().call({ from: account });
          const claimable = earned - paid;
          setCommissionsEarned(parseInt(earned) / 10**18);
          setCommissionsPaid(parseInt(paid) / 10**18);
          setClaimableCommission(parseInt(claimable) / 10**18);

          // Initialize donor cache and referral tree
          if (!donorCache) {
            console.log('Initializing donor cache...');
            setLoadingTree(true);
            const cache = await initializeDonorCache();
            console.log('Donor cache initialized:', cache?.length || 0, 'donors found');
            setDonorCache(cache);
            if (cache) {
              console.log('Building referral tree for account:', account);
              const tree = await fetchReferralTree(account, 0, 4, cache);
              console.log('Referral tree built:', tree);
              setReferralTree(tree);
            } else {
              console.log('No donor cache available to build tree');
            }
            setLoadingTree(false);
          }
        } else {
          console.log('User is not a referrer');
        }
        hasLoadedDataRef.current = true;
      } catch (error) {
        console.error('Failed to fetch referrer data:', error);
        hasLoadedDataRef.current = false;
      }
    };
    fetchReferrerData();
  }, [contract?.methods, account, isReferrer]);

  const initializeDonorCache = async () => {
    try {
      let donors = [];
      let count = 0;
      
      console.log('Starting donor cache initialization...');
      while (true) {
        try {
          const donorAddress = await contract.methods.donors(count).call();
          console.log(`Processing donor ${count}:`, donorAddress);
          const userData = await contract.methods.users(donorAddress).call();
          const referrerData = await contract.methods.referrers(donorAddress).call();
          const userDetails = await contract.methods.getUserDetails().call({ from: donorAddress });

          donors.push({
            address: donorAddress,
            sponsor: userData.sponsor,
            donation: parseInt(userDetails[0]) / 10**18,
            isReferrer: referrerData.isActive,
            rewardsReceived: parseInt(userDetails.totalWithdrawn) / 10**18,
            commissionsEarned: parseInt(referrerData.commissionEarned) / 10**18
          });
          
          if (count % 10 === 0) {
            console.log(`Processed ${count} donors so far`);
            setLoadingProgress(count);
          }
          
          count++;
        } catch (error) {
          console.log('Reached end of donors list or encountered error:', error);
          break;
        }
      }
      
      console.log('Donor cache initialization complete. Total donors:', donors.length);
      return donors;
    } catch (error) {
      console.error('Failed to initialize donor cache:', error);
      return null;
    }
  };

  const fetchReferralTree = async (address, level = 0, maxLevel = 4, cache = null) => {
    if (level >= maxLevel) {
      console.log(`Reached max level ${maxLevel} for address:`, address);
      return null;
    }
    
    try {
      const donors = cache || donorCache;
      
      if (!donors) {
        console.log('No donors cache available for building tree');
        return null;
      }
      
      console.log(`Finding direct referrals for ${address} at level ${level}`);
      const directReferrals = donors
        .filter(donor => {
          const isDirectReferral = donor.sponsor.toLowerCase() === address.toLowerCase();
          if (isDirectReferral) {
            console.log(`Found direct referral:`, donor.address);
          }
          return isDirectReferral;
        })
        .map(async (donor) => {
          console.log(`Processing referral ${donor.address} at level ${level}`);
          const childReferrals = await fetchReferralTree(donor.address, level + 1, maxLevel, donors);
          return {
            address: donor.address,
            donation: donor.donation,
            isReferrer: donor.isReferrer,
            rewardsReceived: donor.rewardsReceived,
            commissionsEarned: donor.commissionsEarned,
            children: childReferrals || []
          };
        });

      const resolvedReferrals = await Promise.all(directReferrals);
      console.log(`Resolved ${resolvedReferrals.length} referrals at level ${level} for ${address}`);
      return resolvedReferrals;
    } catch (error) {
      console.error('Failed to fetch referral tree:', error);
      return null;
    }
  };

  const toggleNode = (address, event) => {
    // Stop the event from bubbling up to parent nodes
    event.stopPropagation();
    
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(address)) {
        newSet.delete(address);
      } else {
        newSet.add(address);
      }
      return newSet;
    });
  };

  const renderReferralTree = (nodes, level = 0) => {
    if (!nodes || nodes.length === 0) return null;

    return (
      <ul className={`referral-level-${level}`}>
        {nodes.map((node) => (
          <li key={node.address} className="referral-node">
            <div className="referral-info" onClick={(e) => toggleNode(node.address, e)}>
              <div className="referral-header">
                <div className="referral-content">
                  <div className="address">{node.address}</div>
                  <div className="referral-details">
                    <div className="stats">
                      <span>Donation: ${node.donation.toLocaleString()}</span>
                      <span>Rewards: ${node.rewardsReceived.toLocaleString()}</span>
                      {node.isReferrer && (
                        <span>Commissions: ${node.commissionsEarned.toLocaleString()}</span>
                      )}
                    </div>
                    <div className={`referrer-badge ${node.isReferrer ? 'active' : 'inactive'}`}>
                      {node.isReferrer ? 'Referrer' : 'Member'}
                    </div>
                  </div>
                </div>
              </div>
              {node.children?.length > 0 && (
                !expandedNodes.has(node.address) ? renderReferralTree(node.children, level + 1) : null
              )}
            </div>
          </li>
        ))}
      </ul>
    );
  };

  const handleClaimCommission = async () => {
    if (!contract || !contract.methods || !account) return;
    
    try {
      await contract.methods.claimCommission().send({ from: account });
      // Refresh the data after claiming
      const { earned, paid } = await contract.methods.getCommissionDetails().call({ from: account });
      const claimable = earned - paid;
      setCommissionsEarned(parseInt(earned) / 10**18);
      setCommissionsPaid(parseInt(paid) / 10**18);
      setClaimableCommission(parseInt(claimable) / 10**18);
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
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

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
          value={referralLink}
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

      <div className="referral-tree-section">
        <h3>Your Referral Network</h3>
        {loadingTree ? (
          <div className="loading-tree">
            Loading referral network... ({loadingProgress} members processed)
          </div>
        ) : referralTree ? (
          <div className="referral-tree">
            {renderReferralTree(referralTree)}
          </div>
        ) : (
          <div className="loading-tree">
            No referrals found
          </div>
        )}
      </div>

      {showError && (
        <ErrorPopup
          message={errorMessage}
          onClose={() => setShowError(false)}
        />
      )}
    </div>
  );
};

export default ReferrerSection;
