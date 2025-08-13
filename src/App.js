import React, { useState, useEffect } from 'react';
import { Settings, Send, Sparkles } from 'lucide-react';
import PostGenerator from './components/PostGenerator';
import SettingsPanel from './components/SettingsPanel';
import Success from './components/Success';
import Cancel from './components/Cancel';
import { useAnalyticsSafe } from './hooks/useAnalyticsSafe';
import './App.css';

function App() {
  // 🛡️ 安全なアナリティクス（既存機能に影響ゼロ）
  useAnalyticsSafe();
  
  const [activeTab, setActiveTab] = useState('generate');
  const [currentPage, setCurrentPage] = useState('main');

  useEffect(() => {
    const path = window.location.pathname;
    const search = window.location.search;

    console.log('🔍 Current URL:', { path, search });

    // URLに基づいてページを決定
    if (path === '/success' || search.includes('session_id')) {
      setCurrentPage('success');
    } else if (path === '/cancel') {
      setCurrentPage('cancel');
    } else {
      setCurrentPage('main');
    }
  }, []);

  if (currentPage === 'success') {
    return <Success />;
  }

  if (currentPage === 'cancel') {
    return <Cancel />;
  }

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <div className="header-content">
            <div className="logo">
              <Sparkles className="logo-icon" />
              <h1>PostPilot Pro</h1>
            </div>
            <nav className="nav-tabs">
              <button
                className={`nav-tab ${activeTab === 'generate' ? 'active' : ''}`}
                onClick={() => setActiveTab('generate')}
              >
                <Send className="tab-icon" />
                投稿生成
              </button>
              <button
                className={`nav-tab ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => setActiveTab('settings')}
              >
                <Settings className="tab-icon" />
                設定
              </button>
            </nav>
          </div>
        </header>

        <main className="main-content">
          {activeTab === 'generate' && <PostGenerator />}
          {activeTab === 'settings' && <SettingsPanel />}
        </main>
      </div>
    </div>
  );
}

export default App;
