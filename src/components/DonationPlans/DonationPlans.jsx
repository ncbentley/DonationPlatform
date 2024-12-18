import React from 'react';
import './DonationPlans.css';

const DonationPlans = ({ onSelectPlan }) => {
  const plans = [
    {
      id: 4,
      name: '4 Month Plan',
      totalReturn: '870% Total Benefits',
      returns: [
        '50% every 120 days (3 times)',
        '30% every 30 days (24 times)'
      ],
      highlights: [
        'Phase 1: Up to 150% in first year',
        'Phase 2: Up to 720% in following 2 years',
        'Total benefits: Up to 870% over 3 years'
      ]
    },
    {
      id: 6,
      name: '6 Month Plan',
      totalReturn: '1230% Total Benefits',
      returns: [
        '75% every 180 days (2 times)',
        '45% every 30 days (24 times)'
      ],
      highlights: [
        'Phase 1: Up to 150% in first year',
        'Phase 2: Up to 1080% in following 2 years',
        'Total benefits: Up to 1230% over 3 years'
      ]
    },
    {
      id: 12,
      name: '12 Month Plan',
      totalReturn: '1590% Total Benefits',
      returns: [
        '150% after 360 days',
        '60% every 30 days (24 times)'
      ],
      highlights: [
        'Phase 1: Up to 150% in first year',
        'Phase 2: Up to 1440% in following 2 years',
        'Total benefits: Up to 1590% over 3 years'
      ]
    }
  ];

  return (
    <div className="donation-plans">
      <h2>Membership Plans</h2>
      <div className="plans-grid">
        {plans.map((plan) => (
          <div key={plan.id} className="plan-card">
            <div className="plan-header">
              <h3>{plan.name}</h3>
              <p className="total-return">Up to {plan.totalReturn}</p>
            </div>
            <div className="plan-content">
              <div className="returns-section">
                <h4>Rewards Schedule</h4>
                <ul>
                  <li>Up to {plan.returns[0]}</li>
                  <li className="then-separator">Then</li>
                  <li>Up to {plan.returns[1]}</li>
                </ul>
              </div>
              <div className="highlights-section">
                <h4>Highlights</h4>
                <ul>
                  {plan.highlights.map((highlight, index) => (
                    <li key={index}>{highlight}</li>
                  ))}
                </ul>
              </div>
              <button onClick={() => onSelectPlan(plan)} className="select-plan-button">
                Select Plan
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DonationPlans; 