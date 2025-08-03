// src/components/SNSConnectionPanel.jsx
import React, { useState, useEffect } from 'react';
import { Twitter, Instagram, Linkedin, CheckCircle, AlertCircle } from 'lucide-react';

const SNSConnectionPanel = ({ userId }) => {
  const [connections, setConnections] = useState({});
  const [isConnecting, setIsConnecting] = useState({});

  useEffect(() => {
    fetchUserConnections();
  }, [userId]);

  const fetchUserConnections = async () => {
    try {
      const response = await fetch(`/api/user-connections?userId=${userId}`);
      const data = await response.json();
      setConnections(data.connections || {});
    } catch (error) {
      console.error('Failed to fetch connections:', error);
    }
  };

  const connectTwitter = async () => {
    setIsConnecting(prev => ({ ...prev, twitter: true }));

    try {
      const response = await fetch('/api/auth/twitter-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      const data = await response.json();

      if (data.authUrl) {
        // 新しいウィンドウでTwitter認証ページを開く
        const popup = window.open(
          data.authUrl,
          'twitter-auth',
          'width=600,height=600,scrollbars=yes,resizable=yes'
        );

        // ポップアップが閉じられたら接続状況を再確認
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            setTimeout(fetchUserConnections, 1000);
            setIsConnecting(prev => ({ ...prev, twitter: false }));
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Twitter connection failed:', error);
      setIsConnecting(prev => ({ ...prev, twitter: false }));
    }
  };

  const connectInstagram = async () => {
    setIsConnecting(prev => ({ ...prev, instagram: true }));

    try {
      // Meta Graph API OAuth flow
      const response = await fetch('/api/auth/instagram-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      const data = await response.json();

      if (data.authUrl) {
        window.open(data.authUrl, 'instagram-auth', 'width=600,height=600');
      }
    } catch (error) {
      console.error('Instagram connection failed:', error);
    } finally {
      setIsConnecting(prev => ({ ...prev, instagram: false }));
    }
  };

  const disconnectSNS = async (platform) => {
    if (!confirm(`${platform}の連携を解除しますか？`)) return;

    try {
      const response = await fetch('/api/disconnect-sns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, platform })
      });

      if (response.ok) {
        fetchUserConnections();
      }
    } catch (error) {
      console.error('Disconnect failed:', error);
    }
  };

  const SNSConnectionCard = ({ platform, icon, name, isConnected, onConnect, onDisconnect }) => (
    <div className="bg-white rounded-lg border p-4 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-lg ${isConnected ? 'bg-green-100' : 'bg-gray-100'}`}>
          {icon}
        </div>
        <div>
          <h3 className="font-medium text-gray-900">{name}</h3>
          <p className="text-sm text-gray-500">
            {isConnected ? (
              <span className="flex items-center space-x-1 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span>連携済み</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1 text-gray-400">
                <AlertCircle className="w-4 h-4" />
                <span>未連携</span>
              </span>
            )}
          </p>
        </div>
      </div>

      <div>
        {isConnected ? (
          <button
            onClick={() => onDisconnect(platform)}
            className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
          >
            解除
          </button>
        ) : (
          <button
            onClick={onConnect}
            disabled={isConnecting[platform]}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isConnecting[platform] ? '接続中...' : '連携'}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">SNSアカウント連携</h2>
        <p className="text-sm text-gray-600">
          SNSアカウントを連携すると、生成した投稿を直接各プラットフォームに投稿できます。
        </p>
      </div>

      <div className="space-y-3">
        <SNSConnectionCard
          platform="twitter"
          icon={<Twitter className="w-5 h-5 text-blue-500" />}
          name="Twitter (X)"
          isConnected={connections.twitter?.isConnected}
          onConnect={connectTwitter}
          onDisconnect={disconnectSNS}
        />

        <SNSConnectionCard
          platform="instagram"
          icon={<Instagram className="w-5 h-5 text-pink-500" />}
          name="Instagram / Threads"
          isConnected={connections.instagram?.isConnected}
          onConnect={connectInstagram}
          onDisconnect={disconnectSNS}
        />

        <SNSConnectionCard
          platform="linkedin"
          icon={<Linkedin className="w-5 h-5 text-blue-700" />}
          name="LinkedIn"
          isConnected={connections.linkedin?.isConnected}
          onConnect={() => { }} // TODO: Implement LinkedIn OAuth
          onDisconnect={disconnectSNS}
        />
      </div>

      {/* 連携状況の説明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">🔒 セキュリティについて</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• アクセストークンは暗号化して安全に保存されます</li>
          <li>• いつでも連携を解除できます</li>
          <li>• 投稿内容は事前に確認してから送信されます</li>
          <li>• パスワードは一切保存されません</li>
        </ul>
      </div>
    </div>
  );
};

export default SNSConnectionPanel;