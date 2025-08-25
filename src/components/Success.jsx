import React from 'react';

const Success = () => {
  const handleReturnToApp = () => {
    // アプリのメイン画面に戻る
    window.location.href = '/app';
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: '24px',
        padding: '3rem',
        maxWidth: '500px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 32px 64px -12px rgba(0, 0, 0, 0.25)'
      }}>
        {/* アイコン */}
        <div style={{
          background: 'linear-gradient(135deg, #D1FAE5, #10B981)',
          borderRadius: '50%',
          width: '80px',
          height: '80px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 2rem auto',
          boxShadow: '0 8px 32px rgba(16, 185, 129, 0.3)'
        }}>
          <span style={{ fontSize: '2.5rem' }}>🎉</span>
        </div>

        {/* タイトル */}
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          color: '#1f2937',
          marginBottom: '1rem'
        }}>
          プレミアムプランへ<br/>
          ようこそ！
        </h1>

        <p style={{
          fontSize: '1.125rem',
          color: '#6b7280',
          marginBottom: '2rem',
          lineHeight: '1.6'
        }}>
          お支払いが完了しました。<br/>
          無制限のAI投稿生成と自動投稿機能をお楽しみください。
        </p>

        {/* プレミアム機能 */}
        <div style={{
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: '16px',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: 'bold',
            color: '#047857',
            marginBottom: '1rem'
          }}>
            👑 プレミアム機能が利用可能
          </h3>
          
          <div style={{
            display: 'grid',
            gap: '0.5rem',
            textAlign: 'left'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              color: '#047857'
            }}>
              <span style={{ color: '#10b981', marginRight: '0.5rem' }}>🚀</span>
              <span>無制限AI投稿生成</span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              color: '#047857'
            }}>
              <span style={{ color: '#10b981', marginRight: '0.5rem' }}>⚡</span>
              <span>高速専用API</span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              color: '#047857'
            }}>
              <span style={{ color: '#10b981', marginRight: '0.5rem' }}>𝕏</span>
              <span>X（旧Twitter）自動投稿</span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              color: '#047857'
            }}>
              <span style={{ color: '#10b981', marginRight: '0.5rem' }}>📱</span>
              <span>Threads自動投稿</span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              color: '#047857'
            }}>
              <span style={{ color: '#10b981', marginRight: '0.5rem' }}>🔄</span>
              <span>同時投稿機能</span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              color: '#047857'
            }}>
              <span style={{ color: '#10b981', marginRight: '0.5rem' }}>👑</span>
              <span>優先サポート</span>
            </div>
          </div>
        </div>

        {/* 利用開始の流れ */}
        <div style={{
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <h4 style={{
            fontSize: '1.125rem',
            fontWeight: 'bold',
            color: '#1e40af',
            marginBottom: '1rem'
          }}>
            🚀 今すぐ始めましょう
          </h4>
          <div style={{
            display: 'grid',
            gap: '0.5rem',
            textAlign: 'left',
            fontSize: '0.875rem',
            color: '#1e40af'
          }}>
            <div>1. X（旧Twitter）・Threadsアカウントを接続</div>
            <div>2. 投稿のテーマやプロンプトを入力</div>
            <div>3. AIが高品質な投稿文を無制限生成</div>
            <div>4. ワンクリックで各SNSに自動投稿</div>
          </div>
        </div>

        {/* アクションボタン */}
        <button
          onClick={handleReturnToApp}
          style={{
            background: 'linear-gradient(45deg, #10b981, #059669)',
            color: 'white',
            padding: '1rem 2rem',
            borderRadius: '50px',
            border: 'none',
            fontSize: '1.125rem',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 8px 32px rgba(16, 185, 129, 0.3)',
            transition: 'all 0.3s ease',
            width: '100%',
            marginBottom: '1rem'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 12px 40px rgba(16, 185, 129, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 8px 32px rgba(16, 185, 129, 0.3)';
          }}
        >
          🎯 プレミアム機能を使い始める
        </button>

        <p style={{
          fontSize: '0.875rem',
          color: '#9ca3af',
          marginBottom: '2rem'
        }}>
          プレミアムプランでSNS運用を最大限に効率化しましょう
        </p>

        {/* 請求・解約情報 */}
        <div style={{
          background: 'rgba(156, 163, 175, 0.1)',
          border: '1px solid rgba(156, 163, 175, 0.2)',
          borderRadius: '12px',
          padding: '1rem',
          marginBottom: '2rem'
        }}>
          <p style={{
            fontSize: '0.875rem',
            color: '#6b7280',
            margin: 0
          }}>
            💳 月額 ¥980 で継続課金されます<br/>
            アプリ内の設定からいつでも解約可能です
          </p>
        </div>

        {/* サポート情報 */}
        <div style={{
          paddingTop: '1.5rem',
          borderTop: '1px solid #e5e7eb'
        }}>
          <p style={{
            fontSize: '0.75rem',
            color: '#9ca3af',
            margin: 0
          }}>
            ご質問やサポートが必要でしたら{' '}
            <a 
              href="mailto:numaken@gmail.com" 
              style={{
                color: '#10b981',
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => {
                e.target.style.textDecoration = 'underline';
              }}
              onMouseLeave={(e) => {
                e.target.style.textDecoration = 'none';
              }}
            >
              numaken@gmail.com
            </a>
            {' '}まで優先対応いたします
          </p>
        </div>
      </div>
    </div>
  );
};

export default Success;