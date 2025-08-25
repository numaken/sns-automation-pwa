import React, { useState } from 'react';
import { Twitter, MessageCircle, CheckCircle, ArrowRight } from 'lucide-react';

const SnsSetup = ({ onSetupComplete }) => {
  const [twitterConnected, setTwitterConnected] = useState(false);
  const [threadsConnected, setThreadsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState({ twitter: false, threads: false });
  const [error, setError] = useState('');

  // 初回レンダリング時に接続状態をチェック
  React.useEffect(() => {
    checkTwitterConnection();
    checkThreadsConnection();

    // メッセージイベントリスナーを追加（認証完了通知を受信）
    const handleMessage = (event) => {
      if (event.data.type === 'TWITTER_AUTH_SUCCESS') {
        setTimeout(() => {
          checkTwitterConnection();
        }, 500);
      } else if (event.data.type === 'THREADS_AUTH_SUCCESS') {
        setTimeout(() => {
          checkThreadsConnection();
        }, 500);
      }
    };

    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Twitter接続処理
  const connectTwitter = async () => {
    setIsConnecting({ ...isConnecting, twitter: true });
    setError('');
    
    try {
      const response = await fetch('/api/auth/twitter/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'twitter-oauth-user-' + Date.now() })
      });

      const data = await response.json();
      
      if (data.authUrl) {
        // 新しいウィンドウで認証を開く
        const authWindow = window.open(
          data.authUrl,
          'twitter-auth',
          'width=600,height=700,scrollbars=yes,resizable=yes'
        );

        // 認証完了を監視
        const checkClosed = setInterval(() => {
          if (authWindow.closed) {
            clearInterval(checkClosed);
            // 認証完了後の処理
            setTimeout(() => {
              checkTwitterConnection();
            }, 1000);
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Twitter connection error:', error);
      setError('Twitter接続でエラーが発生しました');
    } finally {
      setIsConnecting({ ...isConnecting, twitter: false });
    }
  };

  // Threads接続処理
  const connectThreads = async () => {
    setIsConnecting({ ...isConnecting, threads: true });
    setError('');
    
    try {
      const response = await fetch('/api/auth/threads/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'threads-oauth-user-' + Date.now() })
      });

      const data = await response.json();
      
      if (data.authUrl) {
        // 新しいウィンドウで認証を開く
        const authWindow = window.open(
          data.authUrl,
          'threads-auth',
          'width=600,height=700,scrollbars=yes,resizable=yes'
        );

        // 認証完了を監視
        const checkClosed = setInterval(() => {
          if (authWindow.closed) {
            clearInterval(checkClosed);
            // 認証完了後の処理
            setTimeout(() => {
              checkThreadsConnection();
            }, 1000);
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Threads connection error:', error);
      setError('Threads接続でエラーが発生しました');
    } finally {
      setIsConnecting({ ...isConnecting, threads: false });
    }
  };

  // Twitter接続状態確認
  const checkTwitterConnection = () => {
    const token = localStorage.getItem('twitter_token');
    const connected = localStorage.getItem('twitter_connected');
    if (token && connected === 'true') {
      setTwitterConnected(true);
    }
  };

  // Threads接続状態確認
  const checkThreadsConnection = () => {
    const token = localStorage.getItem('threads_token');
    const connected = localStorage.getItem('threads_connected');
    if (token && connected === 'true') {
      setThreadsConnected(true);
    }
  };

  // セットアップ完了処理
  const handleSetupComplete = () => {
    localStorage.setItem('sns_setup_completed', 'true');
    onSetupComplete();
  };

  const bothConnected = twitterConnected && threadsConnected;
  const atLeastOneConnected = twitterConnected || threadsConnected;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #e0f2fe 0%, #e8eaf6 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        maxWidth: '400px',
        width: '100%',
        padding: '32px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* 背景デコレーション */}
        <div style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '100px',
          height: '100px',
          background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
          borderRadius: '50%',
          opacity: '0.1'
        }} />
        
        {/* ヘッダー */}
        <div style={{ textAlign: 'center', marginBottom: '32px', position: 'relative', zIndex: 1 }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            borderRadius: '50%',
            margin: '0 auto 24px auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 25px rgba(59, 130, 246, 0.3)'
          }}>
            <MessageCircle style={{ width: '40px', height: '40px', color: 'white' }} />
          </div>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '800',
            color: '#1f2937',
            marginBottom: '8px',
            background: 'linear-gradient(135deg, #1f2937, #4f46e5)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>SNS接続設定</h1>
          <p style={{
            color: '#6b7280',
            fontSize: '16px',
            lineHeight: '1.5'
          }}>投稿を開始するために、SNSアカウントを接続しましょう</p>
        </div>

        {/* エラー表示 */}
        {error && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <p style={{ color: '#dc2626', fontSize: '14px' }}>{error}</p>
          </div>
        )}

        {/* SNS接続ボタン */}
        <div style={{ marginBottom: '32px' }}>
          {/* Twitter接続 */}
          <div style={{
            border: '2px solid #e5e7eb',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '16px',
            backgroundColor: twitterConnected ? '#f0f9ff' : '#ffffff',
            borderColor: twitterConnected ? '#3b82f6' : '#e5e7eb',
            transition: 'all 0.3s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  padding: '12px',
                  borderRadius: '12px',
                  backgroundColor: '#1da1f2',
                  color: 'white'
                }}>
                  <Twitter style={{ width: '24px', height: '24px' }} />
                </div>
                <div>
                  <div style={{
                    fontWeight: '600',
                    color: '#1f2937',
                    fontSize: '18px'
                  }}>Twitter</div>
                  <div style={{
                    fontSize: '14px',
                    color: '#6b7280'
                  }}>@username として投稿</div>
                </div>
              </div>
              {twitterConnected ? (
                <div style={{
                  padding: '8px',
                  backgroundColor: '#dcfce7',
                  borderRadius: '50%'
                }}>
                  <CheckCircle style={{ width: '24px', height: '24px', color: '#16a34a' }} />
                </div>
              ) : (
                <button
                  onClick={connectTwitter}
                  disabled={isConnecting.twitter}
                  style={{
                    backgroundColor: isConnecting.twitter ? '#93c5fd' : '#1da1f2',
                    color: 'white',
                    padding: '12px 20px',
                    borderRadius: '12px',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: isConnecting.twitter ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    transform: isConnecting.twitter ? 'scale(0.95)' : 'scale(1)'
                  }}
                  onMouseEnter={(e) => {
                    if (!isConnecting.twitter) {
                      e.target.style.backgroundColor = '#1976d2';
                      e.target.style.transform = 'scale(1.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isConnecting.twitter) {
                      e.target.style.backgroundColor = '#1da1f2';
                      e.target.style.transform = 'scale(1)';
                    }
                  }}
                >
                  {isConnecting.twitter ? '接続中...' : '接続'}
                </button>
              )}
            </div>
          </div>

          {/* Threads接続 */}
          <div style={{
            border: '2px solid #e5e7eb',
            borderRadius: '16px',
            padding: '20px',
            backgroundColor: threadsConnected ? '#fafafa' : '#ffffff',
            borderColor: threadsConnected ? '#000000' : '#e5e7eb',
            transition: 'all 0.3s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  padding: '12px',
                  borderRadius: '12px',
                  backgroundColor: '#000000',
                  color: 'white'
                }}>
                  <MessageCircle style={{ width: '24px', height: '24px' }} />
                </div>
                <div>
                  <div style={{
                    fontWeight: '600',
                    color: '#1f2937',
                    fontSize: '18px'
                  }}>Threads</div>
                  <div style={{
                    fontSize: '14px',
                    color: '#6b7280'
                  }}>@username として投稿</div>
                </div>
              </div>
              {threadsConnected ? (
                <div style={{
                  padding: '8px',
                  backgroundColor: '#dcfce7',
                  borderRadius: '50%'
                }}>
                  <CheckCircle style={{ width: '24px', height: '24px', color: '#16a34a' }} />
                </div>
              ) : (
                <button
                  onClick={connectThreads}
                  disabled={isConnecting.threads}
                  style={{
                    backgroundColor: isConnecting.threads ? '#9ca3af' : '#000000',
                    color: 'white',
                    padding: '12px 20px',
                    borderRadius: '12px',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: isConnecting.threads ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    transform: isConnecting.threads ? 'scale(0.95)' : 'scale(1)'
                  }}
                  onMouseEnter={(e) => {
                    if (!isConnecting.threads) {
                      e.target.style.backgroundColor = '#374151';
                      e.target.style.transform = 'scale(1.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isConnecting.threads) {
                      e.target.style.backgroundColor = '#000000';
                      e.target.style.transform = 'scale(1)';
                    }
                  }}
                >
                  {isConnecting.threads ? '接続中...' : '接続'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 完了ボタン */}
        <div>
          {bothConnected && (
            <div style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
              textAlign: 'center'
            }}>
              <p style={{
                color: '#15803d',
                fontSize: '16px',
                fontWeight: '600'
              }}>
                ✅ 両方のSNSアカウントが接続されました！
              </p>
            </div>
          )}

          <button
            onClick={handleSetupComplete}
            disabled={!atLeastOneConnected}
            style={{
              width: '100%',
              padding: '16px 20px',
              borderRadius: '16px',
              border: 'none',
              fontSize: '16px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: atLeastOneConnected ? 'pointer' : 'not-allowed',
              background: atLeastOneConnected
                ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)'
                : '#e5e7eb',
              color: atLeastOneConnected ? 'white' : '#9ca3af',
              transition: 'all 0.3s ease',
              boxShadow: atLeastOneConnected ? '0 10px 25px rgba(59, 130, 246, 0.3)' : 'none',
              transform: 'scale(1)'
            }}
            onMouseEnter={(e) => {
              if (atLeastOneConnected) {
                e.target.style.transform = 'scale(1.02)';
                e.target.style.boxShadow = '0 15px 35px rgba(59, 130, 246, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (atLeastOneConnected) {
                e.target.style.transform = 'scale(1)';
                e.target.style.boxShadow = '0 10px 25px rgba(59, 130, 246, 0.3)';
              }
            }}
          >
            {atLeastOneConnected ? '設定完了して開始' : '1つ以上のSNSを接続してください'}
            {atLeastOneConnected && <ArrowRight style={{ width: '20px', height: '20px' }} />}
          </button>

          {!bothConnected && atLeastOneConnected && (
            <p style={{
              fontSize: '12px',
              color: '#6b7280',
              textAlign: 'center',
              marginTop: '12px'
            }}>
              残りのSNSは後から設定画面で接続できます
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SnsSetup;