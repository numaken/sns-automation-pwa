import React from 'react';
import { Sparkles, Crown } from 'lucide-react';

const Header = ({ userPlan }) => {
  return (
    <header className="pwa-header">
      <div className="pwa-header-container">
        <div className="pwa-logo">
          <Sparkles className="pwa-logo-icon" />
          <div className="logo-group">
            <h1>PostPilot Pro</h1>
            <span className="beta-badge">β版</span>
          </div>
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