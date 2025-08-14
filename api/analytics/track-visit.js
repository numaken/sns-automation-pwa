// PostPilot Pro - 修正版アナリティクストラッキング
// FUNCTION_INVOCATION_FAILED対応

import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // CORS対応
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 🛡️ 即座にレスポンス返却（本体処理遅延ゼロ）
    res.status(200).json({ 
      tracked: true, 
      timestamp: new Date().toISOString(),
      status: 'received'
    });

    // 🔄 非同期バックグラウンド処理（修正版）
    // setImmediate ではなく Promise.resolve().then() を使用
    Promise.resolve().then(async () => {
      try {
        await processAnalyticsSafe(req.body || {});
      } catch (error) {
        // 🔇 サイレントログ（既存システムに影響なし）
        console.log(`[Analytics] Background processing failed:`, error.message);
      }
    });

  } catch (error) {
    // 📊 アナリティクスエラーでも正常応答
    console.log('[Analytics] Handler error:', error.message);
    res.status(200).json({ 
      tracked: false, 
      error: 'silent',
      timestamp: new Date().toISOString()
    });
  }
}

async function processAnalyticsSafe(data) {
  try {
    const { 
      page = '/', 
      referrer = '', 
      utm_source = '',
      utm_campaign = '' 
    } = data;

    // 🔐 既存KVキーと完全分離（プレフィックス使用）
    const prefix = 'analytics_v1_';
    const today = new Date().toISOString().split('T')[0];
    const hour = new Date().getHours();

    // 📊 安全な統計収集（エラー耐性強化）
    const safeOperations = [];

    // 基本統計
    try {
      safeOperations.push(kv.incr(`${prefix}total`));
    } catch (e) { /* ignore */ }

    try {
      safeOperations.push(kv.incr(`${prefix}daily_${today}`));
    } catch (e) { /* ignore */ }

    try {
      safeOperations.push(kv.incr(`${prefix}hourly_${today}_${hour}`));
    } catch (e) { /* ignore */ }

    // オプション統計
    if (page && page !== '/') {
      try {
        const safePage = page.replace(/[^a-zA-Z0-9]/g, '_');
        safeOperations.push(kv.incr(`${prefix}page_${safePage}_${today}`));
      } catch (e) { /* ignore */ }
    }

    if (utm_source) {
      try {
        const safeUtm = utm_source.replace(/[^a-zA-Z0-9]/g, '_');
        safeOperations.push(kv.incr(`${prefix}utm_${safeUtm}_${today}`));
      } catch (e) { /* ignore */ }
    }

    // 🔥 非ブロッキング並行実行（全て失敗でも問題なし）
    if (safeOperations.length > 0) {
      await Promise.allSettled(safeOperations);
    }

  } catch (error) {
    // 🛡️ 完全分離エラーハンドリング
    console.log('[Analytics] processAnalyticsSafe error:', error.message);
  }
}
