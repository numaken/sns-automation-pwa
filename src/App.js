import React, { useState, useEffect } from 'react';
import { Settings, Send, Sparkles } from 'lucide-react';
import PostGenerator from './components/PostGenerator';
import SettingsPanel from './components/SettingsPanel';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('generate');
  const [currentPlan, setCurrentPlan] = useState('free'); // 'free' または 'premium'
  const [usageStats, setUsageStats] = useState(null);

  // 初期化時にプラン情報を読み込み
  useEffect(() => {
    const savedPlan = localStorage.getItem('user_plan');
    if (savedPlan) {
      setCurrentPlan(savedPlan);
    }
  }, []);

  // プラン変更ハンドラー
  const handlePlanChange = (newPlan) => {
    setCurrentPlan(newPlan);
    localStorage.setItem('user_plan', newPlan);
  };

  // 使用状況の更新
  const updateUsageStats = (stats) => {
    setUsageStats(stats);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-6 w-6 text-blue-600" />
            <div>
              <h1 className="text-lg font-bold text-gray-900">SNS自動化</h1>
              <div className="flex items-center space-x-2">
                <span className={`text-xs px-2 py-1 rounded-full ${currentPlan === 'premium'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-green-100 text-green-800'
                  }`}>
                  {currentPlan === 'premium' ? '⭐ プレミアム' : '🆓 無料プラン'}
                </span>
                {currentPlan === 'free' && usageStats && (
                  <span className="text-xs text-blue-600">
                    残り {usageStats.remaining}/3回
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
            <Send className="h-5 w-5" />
            <span className="text-xs font-medium">投稿生成</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-3 px-4 flex flex-col items-center space-y-1 transition-colors ${activeTab === 'settings'
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-blue-600'
              }`}
          >
            <Settings className="h-5 w-5" />
            <span className="text-xs font-medium">設定</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

export default App;