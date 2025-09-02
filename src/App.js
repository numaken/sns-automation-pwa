import React, { useState, useEffect } from 'react';
import PostGenerator from './components/PostGenerator';
import Success from './components/Success';
import Cancel from './components/Cancel';
import './App.css';

function App() {
  const [currentPlan, setCurrentPlan] = useState('free');
  const [currentPage, setCurrentPage] = useState('app'); // 'app', 'success', 'cancel'

  // URL解析とページ決定
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
      setCurrentPage('app');

      // DISABLED: All upgrade promotion functionality for safe free release
      if (search.includes("retry=payment")) {
        // DISABLED: Entire upgrade promotion section removed for safety
        console.log("Payment retry detected but upgrade promotion disabled for free release");
      }
      // DISABLED_FOR_SAFETY:           }
      // DISABLED_FOR_SAFETY:         }, 500);
      // DISABLED_FOR_SAFETY:       }
    }
  }, []);

  // プラン状態の初期化と監視
  useEffect(() => {
    // 初期読み込み（統一されたキー名を使用）
    const savedPlan = localStorage.getItem('userPlan') || 'free';
    console.log('App.js - Initial plan loaded:', savedPlan);
    setCurrentPlan(savedPlan);

    // localStorage変更を監視する関数
    const checkPlanChanges = () => {
      const currentStoredPlan = localStorage.getItem('userPlan') || 'free';
      if (currentStoredPlan !== currentPlan) {
        console.log('App.js - Plan changed detected:', currentStoredPlan);
        setCurrentPlan(currentStoredPlan);
      }
    };

    // 定期的にチェック（同一タブ内の変更を検知）
    const interval = setInterval(checkPlanChanges, 500);

    // storageイベントリスナー（他のタブでの変更を検知）
    window.addEventListener('storage', checkPlanChanges);

    // カスタムイベントリスナー（同一タブ内での即座変更を検知）
    const handlePlanUpdate = (event) => {
      console.log('App.js - Custom plan update event:', event.detail);
      setCurrentPlan(event.detail.plan);
    };
    window.addEventListener('planUpdate', handlePlanUpdate);

    // クリーンアップ
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', checkPlanChanges);
      window.removeEventListener('planUpdate', handlePlanUpdate);
    };
  }, [currentPlan]);

  // プラン変更ハンドラー（統一されたキー名を使用）
  const handlePlanChange = (newPlan) => {
    console.log('App.js - handlePlanChange called:', newPlan);
    setCurrentPlan(newPlan);
    localStorage.setItem('userPlan', newPlan);

    // カスタムイベントを発火して他のコンポーネントに通知
    window.dispatchEvent(new CustomEvent('planUpdate', {
      detail: { plan: newPlan }
    }));
  };


  // ページ別レンダリング
  if (currentPage === 'success') {
    return <Success />;
  }

  if (currentPage === 'cancel') {
    return <Cancel />;
  }

  // メインアプリのレンダリング
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <PostGenerator
        userPlan={currentPlan}
        onPlanChange={handlePlanChange}
      />
    </div>
  );
}

export default App;
