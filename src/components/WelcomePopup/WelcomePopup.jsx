import React from 'react';
import './WelcomePopup.css';

const WelcomePopup = ({ onClose }) => {
  return (
    <div className="popup-container">
      <div className="popup welcome-popup">
        <div className="popup-header">
          <h2>Important Notice</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>
        <div className="welcome-content">
          <p className="notice-text">
            TWPN Members,
          </p>
          <p>
            As some of you may or may not know our account is slightly in the negative after 4 solid months of trading. We have experienced failures with the copy trader twice and both times it caused a loss in the account. Due to the lack of a copy trader our account hasn’t always gotten traded everyday. In fact, Kelli’s biggest days did not include our account. On top of that current market conditions have caused many professional traders losses they don’t normally see. The world is chaotic right now and the markets are a reflection of that.
          </p>
          <p>
            These 1st 4 months performance has put us way behind our payment schedule and now there is almost no way to satisfy the smart contract. Once the account is brought back to even we will offer a full 100% refund to anyone who wants it.
          </p>
          <p>
            Then we would destroy the current smart contract and create a new one. This one would be a little different. A simple 20% per month from whatever she happens to make trading on your funds.
          </p>
          <p>
            TBH, we’ve not done a good job keeping the community updated on what’s been going on and it simply stems from the amount of things we are working on.
          </p>
          <p>
            With that being said we are very very close to the finish line with some funding we have been waiting on for quite some time now. If that comes through we can do a little better than just your money back, but not if you leave. Our bigger picture requires millions of people and we prefer if most of you stayed tapped in here with us as we move through this next phase of our growth.
          </p>
          <p>
            Stay Tuned for more Info!
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomePopup; 