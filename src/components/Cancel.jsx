import React from 'react';

const Cancel = () => {
  const handleReturnToApp = () => {
    // アプリのメイン画面に戻る
    window.location.href = '/';
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
          background: 'linear-gradient(135deg, #FEF3C7, #FCD34D)',
          borderRadius: '50%',
          width: '80px',
          height: '80px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 2rem auto',
          boxShadow: '0 8px 32px rgba(252, 211, 77, 0.3)'
        }}>
          <span style={{ fontSize: '2.5rem' }}>⏸️</span>
        </div>

        {/* タイトル */}
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          color: '#1f2937',
          marginBottom: '1rem'
        }}>
          操作をキャンセルしました
        </h1>

        <p style={{
          fontSize: '1.125rem',
          color: '#6b7280',
          marginBottom: '2rem',
          lineHeight: '1.6'
        }}>
          何も変更されませんでした。<br/>
          引き続き無料プランをお楽しみください。
        </p>

        {/* 現在のプラン情報 */}
        <div style={{
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: '16px',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: 'bold',
            color: '#1e40af',
            marginBottom: '1rem'
          }}>
            🆓 現在のプラン: 無料プラン
          </h3>
          
          <div style={{
            display: 'grid',
            gap: '0.5rem',
            textAlign: 'left'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              color: '#1e40af'
            }}>
              <span style={{ color: '#059669', marginRight: '0.5rem' }}>✅</span>
              <span>1日3回のAI投稿生成</span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              color: '#1e40af'
            }}>
              <span style={{ color: '#059669', marginRight: '0.5rem' }}>✅</span>
              <span>高品質AI生成機能</span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              color: '#1e40af'
            }}>
              <span style={{ color: '#059669', marginRight: '0.5rem' }}>✅</span>
              <span>X・Threads対応</span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              color: '#1e40af'
            }}>
              <span style={{ color: '#059669', marginRight: '0.5rem' }}>✅</span>
              <span>APIキー設定不要</span>
            </div>
          </div>
        </div>

        {/* アクションボタン */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button
            onClick={handleReturnToApp}
            style={{
              background: 'linear-gradient(45deg, #667eea, #764ba2)',
              color: 'white',
              padding: '1rem 2rem',
              borderRadius: '50px',
              border: 'none',
              fontSize: '1.125rem',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 12px 40px rgba(102, 126, 234, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 8px 32px rgba(102, 126, 234, 0.3)';
            }}
          >
            🚀 アプリに戻って投稿生成する
          </button>

          <p style={{
            fontSize: '0.875rem',
            color: '#9ca3af',
            margin: 0
          }}>
            無料版で1日3回まで高品質なAI投稿が生成できます
          </p>
        </div>

        {/* プレミアム案内 */}
        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: '12px'
        }}>
          <p style={{
            fontSize: '0.875rem',
            color: '#047857',
            margin: 0
          }}>
            💡 無制限生成・自動投稿をお求めの場合は、<br/>
            いつでもプレミアムプラン（¥980/月）にアップグレード可能です
          </p>
        </div>

        {/* サポート情報 */}
        <div style={{
          marginTop: '2rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid #e5e7eb'
        }}>
          <p style={{
            fontSize: '0.75rem',
            color: '#9ca3af',
            margin: 0
          }}>
            ご質問がございましたら{' '}
            <a 
              href="mailto:numaken@gmail.com" 
              style={{
                color: '#3b82f6',
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
            {' '}までお気軽にお問い合わせください
          </p>
        </div>
      </div>
    </div>
  );
};

export default Cancel;