import React from 'react';
import { Sparkles, Crown } from 'lucide-react';

const Header = ({ userPlan }) => {
  return (
    <header className="pwa-header">
      <div className="pwa-header-container">
        <div className="pwa-logo">
          <Sparkles className="pwa-logo-icon" />
          <h1>PostPilot Pro</h1>
        </div>
        {userPlan === 'premium' && (
          <div className="pwa-premium-badge">
            <Crown size={12} />
            <span>PRO</span>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;