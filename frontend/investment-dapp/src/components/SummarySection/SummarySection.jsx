import React from 'react';

const SummarySection = ({ totalDeposited, totalPaidOut }) => {
  return (
    <div className="investment-cards">
      <div className="investment-card">
        <div className="card-header">
          <h3>Total Invested</h3>
          <div className="amount-display">
            <span className="amount">${totalDeposited.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="investment-card">
        <div className="card-header">
          <h3>Total Paid Out</h3>
          <div className="amount-display">
            <span className="amount">${totalPaidOut.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummarySection;
