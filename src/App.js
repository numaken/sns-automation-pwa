import React, { useState, useEffect } from 'react';
import { Settings, Send, Sparkles } from 'lucide-react';
import PostGenerator from './components/PostGenerator';
import SettingsPanel from './components/SettingsPanel';
import Success from './components/Success';
import Cancel from './components/Cancel';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('generate');
  const [currentPlan, setCurrentPlan] = useState('free');
  const [usageStats, setUsageStats] = useState(null);
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
        setActiveTab("generate");
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

  // 使用状況の更新
  const updateUsageStats = (stats) => {
    setUsageStats(stats);
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
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div style={{
              width: '32px',
              height: '32px',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px'
            }}>
              ✈️
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">PostPilot Pro</h1>
              <div className="flex items-center space-x-2">
                <span className={`text-xs px-2 py-1 rounded-full ${currentPlan === 'premium'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-600'
                  }`}>
                  {currentPlan === 'premium' ? '⭐ プレミアム' : '無料プラン'}
                </span>
                {currentPlan === 'free' && usageStats && (
                  <span className="text-xs text-gray-600">
                    残り {usageStats.remaining}/3回
                  </span>
                )}
                {currentPlan === 'premium' && (
                  <span className="text-xs text-yellow-600">
                    無制限
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => setActiveTab(activeTab === 'settings' ? 'generate' : 'settings')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Settings className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </header>
      
      <main className="max-w-md mx-auto p-4 pb-20">
        {activeTab === 'generate' ? (
          <PostGenerator
            userPlan={currentPlan}
            onUsageUpdate={updateUsageStats}
            onPlanChange={handlePlanChange}
          />
        ) : (
          <SettingsPanel
            currentPlan={currentPlan}
            onPlanChange={handlePlanChange}
          />
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="max-w-md mx-auto flex">
          <button
            onClick={() => setActiveTab('generate')}
            className={`flex-1 py-3 px-4 flex flex-col items-center space-y-1 transition-colors ${activeTab === 'generate'
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-blue-600'
              }`}
          >
            <span style={{ fontSize: '20px' }}>✈️</span>
            <span className="text-xs font-medium">AI生成</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-3 px-4 flex flex-col items-center space-y-1 transition-colors ${activeTab === 'settings'
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-blue-600'
              }`}
          >
            <span style={{ fontSize: '20px' }}>⚙️</span>
            <span className="text-xs font-medium">設定</span>
          </button>
        </div>
      </nav>

    </div>
  );
}

export default App;
