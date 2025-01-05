import React, { useState, useEffect } from 'react';
import './ReferrerSection.css';
import ErrorPopup from '../ErrorPopup/ErrorPopup';
import TransactionConfirmPopup from '../TransactionConfirmPopup/TransactionConfirmPopup';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { CognitoIdentityClient } from "@aws-sdk/client-cognito-identity";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity";

// Initialize DynamoDB
const dynamodb = DynamoDBDocument.from(new DynamoDB({
  region: process.env.REACT_APP_AWS_REGION || 'us-east-2',
  credentials: fromCognitoIdentityPool({
    client: new CognitoIdentityClient({ region: process.env.REACT_APP_AWS_REGION || 'us-east-2' }),
    identityPoolId: process.env.REACT_APP_IDENTITY_POOL_ID // 'us-east-2:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
  })
}));

const ReferrerSection = ({ 
  isReferrer, 
  handleActivateReferrer, 
  contract, 
  wallet
}) => {
  const [dashboardCopySuccess, setDashboardCopySuccess] = useState(false);
  const [landingPageCopySuccess, setLandingPageCopySuccess] = useState(false);
  const [referrerFee, setReferrerFee] = useState(0);
  const [commissionsEarned, setCommissionsEarned] = useState(0);
  const [commissionsPaid, setCommissionsPaid] = useState(0);
  const [claimableCommission, setClaimableCommission] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [showError, setShowError] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingTransaction, setPendingTransaction] = useState(null);
  const [referralLink, setReferralLink] = useState('');
  const [landingPageLink, setLandingPageLink] = useState('');
  const [loadingTree, setLoadingTree] = useState(false);
  const [referralTree, setReferralTree] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const previousAccountRef = React.useRef(null);

  useEffect(() => {
    if (wallet?.accounts?.[0]?.address && wallet.accounts[0].address !== previousAccountRef.current) {
      previousAccountRef.current = wallet.accounts[0].address;
      setReferralLink(`${window.location.origin}${window.location.pathname}?ref=${wallet.accounts[0].address}`);
      setLandingPageLink(`https://truewealthprosperitynetwork.online?ref=${wallet.accounts[0].address}`);
    }
  }, [wallet]);

  useEffect(() => {
    const fetchReferrerData = async () => {
      if (!contract?.methods || !wallet?.accounts?.[0]?.address) return;
      
      try {
        const fee = await contract.methods.referrerFeeUsd().call();
        setReferrerFee(parseInt(fee) / 10**18);

        if (isReferrer) {
          const { earned, paid } = await contract.methods.getCommissionDetails().call({ from: wallet.accounts[0].address });
          const claimable = earned - paid;
          setCommissionsEarned(parseInt(earned) / 10**18);
          setCommissionsPaid(parseInt(paid) / 10**18);
          setClaimableCommission(parseInt(claimable) / 10**18);

          // Fetch referral tree from DynamoDB
          await fetchReferralTreeFromDB(wallet.accounts[0].address);
        }
      } catch (error) {
        console.error('Failed to fetch referrer data:', error);
        setErrorMessage(error.message || 'Failed to fetch referrer data');
        setShowError(true);
      }
    };
    fetchReferrerData();
  }, [contract?.methods, wallet, isReferrer]);

  const fetchReferralTreeFromDB = async (address, level = 0, maxLevel = 4) => {
    if (level >= maxLevel) return null;
    
    setLoadingTree(true);
    try {
      // Scan the table to get all users
      const { Items } = await dynamodb.scan({
        TableName: process.env.REACT_APP_DYNAMODB_TABLE_NAME || process.env.DYNAMODB_TABLE_NAME,
      });

      if (!Items) {
        setReferralTree([]);
        return; 
      }
      
      // Process the data into a tree structure
      const processedTree = await processReferralData(Items, address.toLowerCase(), level, maxLevel);
      setReferralTree(processedTree);
    } catch (error) {
      console.error('Failed to fetch referral tree:', error);
      setErrorMessage(error.message || 'Failed to fetch referral tree');
      setShowError(true);
    } finally {
      setLoadingTree(false);
    }
  };

  const processReferralData = async (data, currentAddress, level = 0, maxLevel = 4) => {
    if (level >= maxLevel || !data || data.length === 0 || !currentAddress) return null;

    // Get all direct referrals (where sponsor matches the current address)
    const directReferrals = data
      .filter(user => user?.sponsor?.toLowerCase() === currentAddress?.toLowerCase() && user?.address)
      .map(async (user) => {
        // Recursively get children
        const childReferrals = await processReferralData(
          data,
          user.address?.toLowerCase(),
          level + 1,
          maxLevel
        );

        return {
          address: user.address || 'Unknown',
          donation: user.donation || 0,
          isReferrer: user.isReferrer || false,
          rewardsReceived: user.totalWithdrawn || 0,
          commissionsEarned: user.commissionsEarned || 0,
          startTime: user.startTime || Date.now(),
          children: childReferrals || []
        };
      });

    return Promise.all(directReferrals);
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
  };

  const toggleNode = (address, event) => {
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
                      <span>Joined: {formatDate(node.startTime)}</span>
                      <span>Membership Amount: ${node.donation.toLocaleString()}</span>
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
    if (!contract || !contract.methods || !wallet?.accounts?.[0]?.address) return;
    
    try {
      await contract.methods.claimCommission().send({ from: wallet.accounts[0].address });
      // Refresh the data after claiming
      const { earned, paid } = await contract.methods.getCommissionDetails().call({ from: wallet.accounts[0].address });
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
    if (!contract || !contract.methods || !wallet?.accounts?.[0]?.address) return;
    
    try {
      setPendingTransaction({
        type: 'activateReferrer',
        details: {
          amount: referrerFee,
          totalAmount: referrerFee,
          from: wallet.accounts[0].address
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
    if (!contract || !contract.methods || !wallet?.accounts?.[0]?.address) return;
    
    try {
      await handleActivateReferrer(wallet.accounts[0].address);
      setShowConfirm(false);
    } catch (error) {
      console.error('Failed to activate referrer:', error);
      setErrorMessage(error.message || 'Failed to activate referrer');
      setShowError(true);
      setShowConfirm(false);
    }
  };

  const handleCopyDashboardLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setDashboardCopySuccess(true);
      setTimeout(() => setDashboardCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleCopyLandingPageLink = async () => {
    try {
      await navigator.clipboard.writeText(landingPageLink);
      setLandingPageCopySuccess(true);
      setTimeout(() => setLandingPageCopySuccess(false), 2000);
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
      
      <div className="referral-link-section">
        <div className="referral-link-row">
          <span className="referral-link-label">Dashboard:</span>
          <div className="referral-link-input-group">
            <input
              type="text"
              readOnly
              value={referralLink}
              className="referral-link-input"
            />
            <button 
              onClick={handleCopyDashboardLink}
              className={`copy-button ${dashboardCopySuccess ? 'success' : ''}`}
            >
              {dashboardCopySuccess ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        <div className="referral-link-row">
          <span className="referral-link-label">Landing Page:</span>
          <div className="referral-link-input-group">
            <input
              type="text"
              readOnly
              value={landingPageLink}
              className="referral-link-input"
            />
            <button 
              onClick={handleCopyLandingPageLink}
              className={`copy-button ${landingPageCopySuccess ? 'success' : ''}`}
            >
              {landingPageCopySuccess ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
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
            Loading referral network...
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