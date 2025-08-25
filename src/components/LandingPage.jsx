import React from 'react';

const LandingPage = ({ onNavigateToApp }) => {
  const handleGetStarted = () => {
    // SPAらしく状態変更で遷移
    if (onNavigateToApp) {
      onNavigateToApp();
    } else {
      // フォールバック
      window.location.href = '/app';
    }
  };

  const handleLogin = () => {
    // SPAらしく状態変更で遷移
    if (onNavigateToApp) {
      onNavigateToApp();
    } else {
      // フォールバック
      window.location.href = '/app';
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* ナビゲーション */}
      <nav style={{
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          color: 'white'
        }}>
          🚀 PostPilot Pro
        </div>
        <button
          onClick={handleLogin}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            color: 'white',
            padding: '0.5rem 1.5rem',
            borderRadius: '25px',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            cursor: 'pointer',
            fontWeight: '500',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.2)';
          }}
        >
          ログイン・アプリを開く
        </button>
      </nav>

      {/* ヒーローセクション */}
      <section style={{
        textAlign: 'center',
        padding: '4rem 2rem',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <div style={{
          display: 'inline-block',
          background: 'linear-gradient(45deg, #10B981, #059669)',
          color: 'white',
          padding: '0.75rem 2rem',
          borderRadius: '50px',
          fontSize: '1.25rem',
          fontWeight: 'bold',
          marginBottom: '2rem',
          boxShadow: '0 8px 32px rgba(16, 185, 129, 0.3)',
          animation: 'pulse 2s infinite'
        }}>
          🎉 完全無料で今すぐ試せます！
        </div>

        <h1 style={{
          fontSize: '3rem',
          fontWeight: 'bold',
          color: 'white',
          marginBottom: '1.5rem',
          lineHeight: '1.2'
        }}>
          <span style={{
            background: 'linear-gradient(45deg, #FFE066, #FF6B6B)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent'
          }}>
            「今月いくら請求される？」
          </span><br/>
          <span style={{ fontSize: '2.5rem' }}>😰</span> の不安もなし・月額固定¥980
        </h1>

        <p style={{
          fontSize: '1.25rem',
          color: 'rgba(255, 255, 255, 0.9)',
          marginBottom: '3rem',
          maxWidth: '700px',
          margin: '0 auto 3rem auto',
          lineHeight: '1.6'
        }}>
          <strong>他社の複雑な設定に挫折した方にこそおすすめ！</strong><br/>
          APIキー設定・OpenAI登録・クレカ登録すべて不要で即利用開始<br/>
          完全予算管理で安心してAI投稿生成をお楽しみください
        </p>

        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={handleGetStarted}
            style={{
              background: 'linear-gradient(45deg, #FF6B6B, #4ECDC4)',
              color: 'white',
              padding: '1rem 2.5rem',
              borderRadius: '50px',
              border: 'none',
              fontSize: '1.125rem',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 8px 32px rgba(255, 107, 107, 0.3)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 12px 40px rgba(255, 107, 107, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 8px 32px rgba(255, 107, 107, 0.3)';
            }}
          >
            🚀 今すぐ始める（無料）
          </button>

          <button
            onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
            style={{
              background: 'transparent',
              color: 'white',
              padding: '1rem 2.5rem',
              borderRadius: '50px',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              fontSize: '1.125rem',
              fontWeight: '600',
              cursor: 'pointer',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.1)';
              e.target.style.border = '2px solid rgba(255, 255, 255, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'transparent';
              e.target.style.border = '2px solid rgba(255, 255, 255, 0.3)';
            }}
          >
            📖 詳細を見る
          </button>
        </div>
      </section>

      {/* 業界初の成果セクション */}
      <section style={{
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(16, 185, 129, 0.1))',
        margin: '2rem',
        borderRadius: '20px',
        padding: '3rem 2rem',
        border: '1px solid rgba(59, 130, 246, 0.2)'
      }}>
        <h2 style={{
          textAlign: 'center',
          fontSize: '2rem',
          fontWeight: 'bold',
          color: 'white',
          marginBottom: '2rem'
        }}>
          🚀 APIキー設定不要の圧倒的メリット
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '2rem',
          maxWidth: '800px',
          margin: '0 auto'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '2.5rem',
              fontWeight: 'bold',
              color: '#3B82F6',
              marginBottom: '0.5rem'
            }}>即座</div>
            <div style={{
              fontSize: '1rem',
              color: 'white',
              fontWeight: 'bold',
              marginBottom: '0.5rem'
            }}>利用開始</div>
            <div style={{
              fontSize: '0.875rem',
              color: 'rgba(255, 255, 255, 0.8)'
            }}>サインアップ後すぐ</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '2.5rem',
              fontWeight: 'bold',
              color: '#10B981',
              marginBottom: '0.5rem'
            }}>安全</div>
            <div style={{
              fontSize: '1rem',
              color: 'white',
              fontWeight: 'bold',
              marginBottom: '0.5rem'
            }}>セキュリティ</div>
            <div style={{
              fontSize: '0.875rem',
              color: 'rgba(255, 255, 255, 0.8)'
            }}>APIキー漏洩リスクなし</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '2.5rem',
              fontWeight: 'bold',
              color: '#F59E0B',
              marginBottom: '0.5rem'
            }}>予算</div>
            <div style={{
              fontSize: '1rem',
              color: 'white',
              fontWeight: 'bold',
              marginBottom: '0.5rem'
            }}>管理簡単</div>
            <div style={{
              fontSize: '0.875rem',
              color: 'rgba(255, 255, 255, 0.8)'
            }}>月額固定¥980のみ</div>
          </div>
        </div>
      </section>

      {/* 主要機能セクション */}
      <section id="features" style={{
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(20px)',
        margin: '2rem',
        borderRadius: '20px',
        padding: '4rem 2rem'
      }}>
        <h2 style={{
          textAlign: 'center',
          fontSize: '2.5rem',
          fontWeight: 'bold',
          color: 'white',
          marginBottom: '3rem'
        }}>
          🌟 主要機能
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          {/* APIキー不要の簡単さ */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '15px',
            padding: '2rem',
            textAlign: 'center',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔑</div>
            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '1rem'
            }}>
              APIキー設定不要
            </h3>
            <p style={{
              color: 'rgba(255, 255, 255, 0.8)',
              lineHeight: '1.6'
            }}>
              <strong>他社AIツールの99%がAPIキー設定必須</strong><br/>
              当サービスなら技術知識不要で即座に利用開始！<br/>
              セキュリティリスク・設定ミスの心配もありません。
            </p>
          </div>

          {/* AI品質評価システム */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '15px',
            padding: '2rem',
            textAlign: 'center',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎯</div>
            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '1rem'
            }}>
              AI品質評価システム
            </h3>
            <p style={{
              color: 'rgba(255, 255, 255, 0.8)',
              lineHeight: '1.6'
            }}>
              <strong>投稿品質をA~F評価で自動判定</strong><br/>
              エンゲージメント予測で、より効果的な投稿を生成。
            </p>
          </div>

          {/* 料金透明性 */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '15px',
            padding: '2rem',
            textAlign: 'center',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💰</div>
            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '1rem'
            }}>
              完全固定料金制
            </h3>
            <p style={{
              color: 'rgba(255, 255, 255, 0.8)',
              lineHeight: '1.6'
            }}>
              <strong>隠れた従量課金は一切なし</strong><br/>
              月額¥980でAPIコスト込み、使い放題の安心設計。
            </p>
          </div>
        </div>
      </section>

      {/* 料金プラン */}
      <section style={{
        padding: '4rem 2rem',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <h2 style={{
          textAlign: 'center',
          fontSize: '2.5rem',
          fontWeight: 'bold',
          color: 'white',
          marginBottom: '3rem'
        }}>
          💰 シンプルな料金体系
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem',
          maxWidth: '800px',
          margin: '0 auto'
        }}>
          {/* 無料プラン */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '15px',
            padding: '2rem',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '0.5rem',
              textAlign: 'center'
            }}>
              🆓 無料プラン
            </h3>
            <div style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              color: '#4ECDC4',
              textAlign: 'center',
              marginBottom: '1.5rem'
            }}>
              ¥0
            </div>
            <ul style={{
              color: 'rgba(255, 255, 255, 0.8)',
              listStyle: 'none',
              padding: 0,
              lineHeight: '1.8'
            }}>
              <li>📝 1日3回まで投稿生成</li>
              <li><strong>🔑 APIキー設定不要</strong></li>
              <li><strong>🎯 AI品質評価（A~F評価）</strong></li>
              <li>📱 X・Threads連携</li>
              <li><strong>💰 完全無料・隠れコストなし</strong></li>
            </ul>
          </div>

          {/* プレミアムプラン */}
          <div style={{
            background: 'linear-gradient(135deg, #FF6B6B, #4ECDC4)',
            borderRadius: '15px',
            padding: '2rem',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              top: '-10px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#FFE066',
              color: '#333',
              padding: '0.25rem 1rem',
              borderRadius: '15px',
              fontSize: '0.875rem',
              fontWeight: 'bold'
            }}>
              🔥 人気
            </div>
            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '0.5rem',
              textAlign: 'center'
            }}>
              👑 プレミアムプラン
            </h3>
            <div style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              color: 'white',
              textAlign: 'center',
              marginBottom: '1.5rem'
            }}>
              ¥980<span style={{ fontSize: '1rem', fontWeight: 'normal' }}>/月</span>
            </div>
            <ul style={{
              color: 'white',
              listStyle: 'none',
              padding: 0,
              lineHeight: '1.8'
            }}>
              <li><strong>🚀 無制限投稿生成</strong></li>
              <li><strong>⚡ 高速専用API（8秒 vs 15秒）</strong></li>
              <li>📱 全SNS自動投稿</li>
              <li>🔄 同時投稿機能</li>
              <li><strong>💰 完全固定¥980・従量課金なし</strong></li>
              <li>👑 優先サポート</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 利用開始の流れ */}
      <section style={{
        background: 'rgba(0, 0, 0, 0.1)',
        margin: '2rem',
        borderRadius: '20px',
        padding: '4rem 2rem'
      }}>
        <h2 style={{
          textAlign: 'center',
          fontSize: '2.5rem',
          fontWeight: 'bold',
          color: 'white',
          marginBottom: '3rem'
        }}>
          🚀 利用開始の流れ
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '2rem',
          maxWidth: '1000px',
          margin: '0 auto'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              background: 'linear-gradient(45deg, #667eea, #764ba2)',
              borderRadius: '50%',
              width: '80px',
              height: '80px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem auto',
              fontSize: '2rem'
            }}>
              1️⃣
            </div>
            <h4 style={{
              fontSize: '1.25rem',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '0.5rem'
            }}>
              SNSアカウント連携
            </h4>
            <p style={{
              color: 'rgba(255, 255, 255, 0.8)',
              lineHeight: '1.6'
            }}>
              <strong>設定不要で即連携</strong><br/>
              他社と違って面倒なAPIキー設定は一切不要
            </p>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{
              background: 'linear-gradient(45deg, #FF6B6B, #4ECDC4)',
              borderRadius: '50%',
              width: '80px',
              height: '80px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem auto',
              fontSize: '2rem'
            }}>
              2️⃣
            </div>
            <h4 style={{
              fontSize: '1.25rem',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '0.5rem'
            }}>
              AI投稿生成
            </h4>
            <p style={{
              color: 'rgba(255, 255, 255, 0.8)',
              lineHeight: '1.6'
            }}>
              <strong>AI品質評価システム搭載</strong><br/>
              A~F評価でエンゲージメント予測も可能
            </p>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{
              background: 'linear-gradient(45deg, #4ECDC4, #45B7D1)',
              borderRadius: '50%',
              width: '80px',
              height: '80px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem auto',
              fontSize: '2rem'
            }}>
              3️⃣
            </div>
            <h4 style={{
              fontSize: '1.25rem',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '0.5rem'
            }}>
              自動投稿完了
            </h4>
            <p style={{
              color: 'rgba(255, 255, 255, 0.8)',
              lineHeight: '1.6'
            }}>
              <strong>隠れた従量課金なし</strong><br/>
              固定料金でAPIコストも全て込み
            </p>
          </div>
        </div>
      </section>

      {/* 最終CTA */}
      <section style={{
        textAlign: 'center',
        padding: '4rem 2rem'
      }}>
        <h2 style={{
          fontSize: '2.5rem',
          fontWeight: 'bold',
          color: 'white',
          marginBottom: '1rem'
        }}>
          今すぐSNS運用を効率化しよう！
        </h2>
        <p style={{
          fontSize: '1.125rem',
          color: 'rgba(255, 255, 255, 0.8)',
          marginBottom: '2rem',
          maxWidth: '600px',
          margin: '0 auto 2rem auto'
        }}>
          <strong>APIキー設定・OpenAI登録・クレカ登録すべて不要！</strong><br/>
          「今月いくら請求される？」の不安もなし・月額固定¥980の完全予算管理<br/>
          他社の複雑な設定に挫折した方にこそおすすめです
        </p>
        <button
          onClick={handleGetStarted}
          style={{
            background: 'linear-gradient(45deg, #FF6B6B, #4ECDC4)',
            color: 'white',
            padding: '1.25rem 3rem',
            borderRadius: '50px',
            border: 'none',
            fontSize: '1.25rem',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 8px 32px rgba(255, 107, 107, 0.3)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-3px)';
            e.target.style.boxShadow = '0 15px 50px rgba(255, 107, 107, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 8px 32px rgba(255, 107, 107, 0.3)';
          }}
        >
          🚀 無料で始める
        </button>
      </section>

      {/* フッター */}
      <footer style={{
        background: 'rgba(0, 0, 0, 0.2)',
        textAlign: 'center',
        padding: '2rem',
        color: 'rgba(255, 255, 255, 0.6)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <p>© 2024 PostPilot Pro. All rights reserved.</p>
        <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
          AI-powered SNS automation tool for efficient social media management.
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;