// Google Analytics 4 カスタムイベント

// GA4イベント送信
export const trackEvent = (eventName, parameters = {}) => {
  try {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', eventName, parameters);
    }
  } catch (error) {
    console.log('[GA4] Event tracking fallback');
  }
};

// 投稿生成イベント
export const trackPostGeneration = (platform, tone, plan) => {
  trackEvent('generate_post', {
    platform: platform,
    tone: tone,
    user_plan: plan,
    event_category: 'engagement',
    event_label: `${platform}_${tone}`
  });
};

// プレミアムアップグレード
export const trackPremiumClick = (location) => {
  trackEvent('premium_upgrade_click', {
    event_category: 'conversion',
    location: location,
    event_label: 'upgrade_button'
  });
};

// SNS連携
export const trackSocialConnect = (platform, success) => {
  trackEvent('social_connect', {
    platform: platform,
    success: success,
    event_category: 'integration'
  });
};

// ページビュー（SPAルート変更）
export const trackPageView = (pagePath) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', 'G-L68H6Z828T', {
      page_path: pagePath
    });
  }
};