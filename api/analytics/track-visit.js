// PostPilot Pro - 分離型アナリティクストラッキング
// 既存システムへの影響ゼロ設計

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
      timestamp: new Date().toISOString() 
    });

    // 🔄 非同期バックグラウンド処理（既存機能に影響なし）
    setImmediate(async () => {
      try {
        await processAnalyticsSafe(req.body);
      } catch (error) {
        // 🔇 サイレントログ（既存システムに影響なし）
        console.log(`[Analytics] Safe tracking failed: ${error.message}`);
      }
    });

  } catch (error) {
    // 📊 アナリティクスエラーでも正常応答
    res.status(200).json({ tracked: false, error: 'silent' });
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
    const today = new Date().toISOString().split('T')[0]; // 2025-08-14
    const hour = new Date().getHours();

    // 📊 分離されたKVキーで安全な統計収集
    const safeOperations = [
      // 日別総アクセス数
      kv.incr(`${prefix}daily_${today}`).catch(() => null),
      
      // 時間別アクセス数
      kv.incr(`${prefix}hourly_${today}_${hour}`).catch(() => null),
      
      // ページ別アクセス数（安全なページ名に変換）
      kv.incr(`${prefix}page_${page.replace(/[^a-zA-Z0-9]/g, '_')}_${today}`).catch(() => null),
      
      // 流入元統計
      referrer && kv.incr(`${prefix}ref_${referrer.replace(/[^a-zA-Z0-9.]/g, '_')}_${today}`).catch(() => null),
      
      // UTM統計
      utm_source && kv.incr(`${prefix}utm_${utm_source}_${today}`).catch(() => null),
    ].filter(Boolean);

    // 🔥 非ブロッキング並行実行（一部失敗でも継続）
    await Promise.allSettled(safeOperations);

    // 📈 累計カウント（失敗しても既存機能に影響なし）
    await kv.incr(`${prefix}total`).catch(() => null);

  } catch (error) {
    // 🛡️ 完全分離エラーハンドリング
    throw error;
  }
}
