// src/App.jsx - SNS自動化PWA メインアプリ
import React, { useState, useEffect } from 'react';
import { Settings, Send, Copy, Sparkles, Twitter } from 'lucide-react';
import PostGenerator from './components/PostGenerator';
import SettingsPanel from './components/SettingsPanel';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('generate');
  const [settings, setSettings] = useState({
    openaiKey: '',
    twitterTokens: null,
    audience: '副業ブロガー',
    style: '親しみやすい',
    topic: '副業と本業の時間管理'
  });

  // 設定の保存・読み込み
  useEffect(() => {
    const savedSettings = localStorage.getItem('sns_automation_settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  const saveSettings = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem('sns_automation_settings', JSON.stringify(newSettings));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-6 w-6 text-blue-600" />
            <h1 className="text-lg font-bold text-gray-900">SNS自動化</h1>
          </div>
          <button
            onClick={() => setActiveTab(activeTab === 'settings' ? 'generate' : 'settings')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Settings className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto p-4 pb-20">
        {activeTab === 'generate' ? (
          <PostGenerator settings={settings} />
        ) : (
          <SettingsPanel settings={settings} onSave={saveSettings} />
        )}
      </main>

      {/* Bottom Navigation */}
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