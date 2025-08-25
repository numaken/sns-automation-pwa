import React, { useState, useEffect } from 'react';
import PostGenerator from './components/PostGenerator';
import SettingsPanel from './components/SettingsPanel';
import Success from './components/Success';
import Cancel from './components/Cancel';
import Header from './components/Header';
import Footer from './components/Footer';
import LandingPage from './components/LandingPage';
import { useAnalyticsSafe } from './hooks/useAnalyticsSafe';
import './App.css';
import './styles/PWAStyle.css';

function App() {
  // 🛡️ 安全なアナリティクス（既存機能に影響ゼロ）
  useAnalyticsSafe();
  
  const [activeTab, setActiveTab] = useState('generate');
  const [currentPage, setCurrentPage] = useState('main');
  const [userPlan, setUserPlan] = useState('free');

  // ページ遷移用関数（SPAらしくリロードなし）
  const navigateToApp = () => {
    setCurrentPage('main');
    // URLも更新（ブラウザの戻るボタン対応）
    window.history.pushState({}, '', '/app');
  };

  useEffect(() => {
    const path = window.location.pathname;
    const search = window.location.search;

    console.log('🔍 Current URL:', { path, search });

    // URLに基づいてページを決定
    if (path === '/success' || search.includes('session_id')) {
      setCurrentPage('success');
    } else if (path === '/cancel') {
      setCurrentPage('cancel');
    } else if (path === '/app') {
      setCurrentPage('main');
    } else if (path === '/') {
      setCurrentPage('landing');
    } else {
      // 既存ユーザーの互換性のため、不明なパスはメイン機能に転送
      setCurrentPage('main');
    }

    // ユーザープランをチェック
    const storedPlan = localStorage.getItem('userPlan');
    if (storedPlan) {
      setUserPlan(storedPlan);
    }

    // ブラウザの戻る/進むボタン対応
    const handlePopState = () => {
      const newPath = window.location.pathname;
      if (newPath === '/success' || window.location.search.includes('session_id')) {
        setCurrentPage('success');
      } else if (newPath === '/cancel') {
        setCurrentPage('cancel');
      } else if (newPath === '/app') {
        setCurrentPage('main');
      } else if (newPath === '/') {
        setCurrentPage('landing');
      } else {
        setCurrentPage('main');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (currentPage === 'success') {
    return <Success />;
  }

  if (currentPage === 'cancel') {
    return <Cancel />;
  }

  if (currentPage === 'landing') {
    return <LandingPage onNavigateToApp={navigateToApp} />;
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
