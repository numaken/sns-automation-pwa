import React from 'react';
import { Crown, Zap, X } from 'lucide-react';

const UpgradePrompt = ({ isVisible, onClose, onUpgrade, remainingUses }) => {
  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        padding: '1.5rem',
        maxWidth: '28rem',
        margin: '1rem',
        position: 'relative'
      }}>
        {/* 閉じるボタン */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#6b7280'
          }}
        >
          <X style={{ height: '1.5rem', width: '1.5rem' }} />
        </button>

        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: '1rem' }}>
            <Crown style={{ height: '3rem', width: '3rem', color: '#fbbf24', margin: '0 auto 0.5rem' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>
              {remainingUses === 0 ? '本日の無料生成完了！' : 'もっと生成しませんか？'}
            </h2>
          </div>

          <div style={{
            background: 'linear-gradient(to right, #fef3c7, #fed7aa)',
            borderRadius: '0.5rem',
            padding: '1rem',
            marginBottom: '1rem'
          }}>
            <h3 style={{ fontWeight: '600', color: '#92400e', marginBottom: '0.5rem', fontSize: '1rem' }}>
              プレミアムで解放される機能
            </h3>
            <ul style={{ color: '#a16207', fontSize: '0.875rem', listStyle: 'none', padding: 0, margin: 0, textAlign: 'left' }}>
              <li style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
                <Zap style={{ height: '1rem', width: '1rem', marginRight: '0.5rem' }} />
                無制限の投稿生成
              </li>
              <li style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
                <Zap style={{ height: '1rem', width: '1rem', marginRight: '0.5rem' }} />
                高速生成（専用APIキー）
              </li>
              <li style={{ display: 'flex', alignItems: 'center' }}>
                <Crown style={{ height: '1rem', width: '1rem', marginRight: '0.5rem' }} />
                広告なしのクリーンUI
              </li>
            </ul>
          </div>

          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
            {remainingUses === 0
              ? '明日も無料で3回生成できますが、今すぐ無制限で使いませんか？'
              : `残り${remainingUses}回の無料生成があります。`
            }
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button
              onClick={onUpgrade}
              style={{
                width: '100%',
                background: '#fbbf24',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                fontWeight: '500',
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#f59e0b'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#fbbf24'}
            >
              月額¥980でアップグレード
            </button>
            <button
              onClick={onClose}
              style={{
                width: '100%',
                color: '#6b7280',
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              {remainingUses === 0 ? '明日まで待つ' : '後で決める'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpgradePrompt;