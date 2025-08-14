import React from 'react';
import { Send, Settings } from 'lucide-react';

const Footer = ({ activeTab, setActiveTab }) => {
  return (
    <footer className="pwa-footer">
      <nav className="pwa-nav">
        <button
          className={`pwa-nav-item ${activeTab === 'generate' ? 'active' : ''}`}
          onClick={() => setActiveTab('generate')}
        >
          <Send size={20} />
          <span>投稿生成</span>
        </button>
        <button
          className={`pwa-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings size={20} />
          <span>設定</span>
        </button>
      </nav>
    </footer>
  );
};

export default Footer;