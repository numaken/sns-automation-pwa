import React, { useState, useEffect } from 'react';
import PostGenerator from './components/PostGenerator';
import SettingsPanel from './components/SettingsPanel';
import Success from './components/Success';
import Cancel from './components/Cancel';
import Header from './components/Header';
import Footer from './components/Footer';
import { useAnalyticsSafe } from './hooks/useAnalyticsSafe';
import './App.css';
import './styles/PWAStyle.css';

function App() {
  // 🛡️ 安全なアナリティクス（既存機能に影響ゼロ）
  useAnalyticsSafe();
  
  const [activeTab, setActiveTab] = useState('generate');
  const [currentPage, setCurrentPage] = useState('main');
  const [userPlan, setUserPlan] = useState('free');

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

    // ユーザープランをチェック
    const storedPlan = localStorage.getItem('userPlan');
    if (storedPlan) {
      setUserPlan(storedPlan);
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
      <Header userPlan={userPlan} />
      
      <main className="pwa-main">
        {activeTab === 'generate' && <PostGenerator />}
        {activeTab === 'settings' && <SettingsPanel />}
      </main>

      <Footer 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
      />
    </div>
  );
}

export default App;
