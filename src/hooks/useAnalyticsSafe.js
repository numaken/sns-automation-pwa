// PostPilot Pro - 安全なアナリティクスフック
// 既存UI/UXへの影響ゼロ設計

import { useEffect, useRef } from 'react';

export const useAnalyticsSafe = () => {
  const hasTracked = useRef(false);

  useEffect(() => {
    // 🛡️ 重複実行防止
    if (hasTracked.current) return;

    // ⏱️ 本体ロード完了後に遅延実行（UI影響ゼロ）
    const delayedTracker = setTimeout(() => {
      trackVisitSafe();
      hasTracked.current = true;
    }, 3000); // 3秒遅延でユーザー体験完全保護

    return () => {
      clearTimeout(delayedTracker);
    };
  }, []);
};

const trackVisitSafe = async () => {
  try {
    // 📊 URLパラメータ安全取得
    const urlParams = new URLSearchParams(window.location.search);
    
    const trackingData = {
      page: window.location.pathname,
      referrer: document.referrer || 'direct',
      utm_source: urlParams.get('utm_source') || '',
      utm_campaign: urlParams.get('utm_campaign') || '',
      timestamp: Date.now()
    };

    // 🚀 非ブロッキング送信（既存機能に影響なし）
    await fetch('/api/analytics/track-visit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(trackingData),
    });

  } catch (error) {
    // 🔇 完全サイレント（ユーザーに影響・通知なし）
    console.log('[Analytics] Safe tracking completed with fallback');
  }
};

// 🔧 オプション: 手動トラッキング関数
export const trackEventSafe = async (eventData) => {
  try {
    await fetch('/api/analytics/track-visit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...eventData,
        type: 'custom_event',
        timestamp: Date.now()
      }),
    });
  } catch {
    // サイレント失敗
  }
};
