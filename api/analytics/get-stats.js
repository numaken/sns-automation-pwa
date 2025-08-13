// PostPilot Pro - 分離型アナリティクス統計取得
// 読み取り専用・既存システム影響ゼロ

import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // CORS対応
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const prefix = 'analytics_v1_';
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // 🔍 安全な並行読み取り（既存KVキーに影響なし）
    const [
      totalVisits,
      todayVisits,
      yesterdayVisits,
      hourlyData
    ] = await Promise.allSettled([
      kv.get(`${prefix}total`),
      kv.get(`${prefix}daily_${today}`),
      kv.get(`${prefix}daily_${yesterday}`),
      getHourlyStatsSafe(prefix, today)
    ]);

    // 📊 安全なデータ整形
    const analytics = {
      summary: {
        total_visits: getSettledValue(totalVisits) || 0,
        today_visits: getSettledValue(todayVisits) || 0,
        yesterday_visits: getSettledValue(yesterdayVisits) || 0,
        growth_rate: calculateGrowthRate(
          getSettledValue(todayVisits) || 0,
          getSettledValue(yesterdayVisits) || 0
        )
      },
      hourly_breakdown: getSettledValue(hourlyData) || [],
      generated_at: new Date().toISOString(),
      status: 'safe_mode'
    };

    res.status(200).json(analytics);

  } catch (error) {
    // 🛡️ エラー時も安全なレスポンス
    res.status(200).json({
      summary: { total_visits: 0, today_visits: 0, yesterday_visits: 0 },
      error: 'safe_fallback',
      generated_at: new Date().toISOString()
    });
  }
}

async function getHourlyStatsSafe(prefix, date) {
  const hourlyPromises = Array.from({length: 24}, (_, hour) => 
    kv.get(`${prefix}hourly_${date}_${hour}`).catch(() => 0)
  );
  
  const hourlyResults = await Promise.allSettled(hourlyPromises);
  
  return hourlyResults.map((result, hour) => ({
    hour,
    visits: result.status === 'fulfilled' ? (result.value || 0) : 0
  }));
}

function getSettledValue(settledPromise) {
  return settledPromise.status === 'fulfilled' ? settledPromise.value : null;
}

function calculateGrowthRate(today, yesterday) {
  if (yesterday === 0) return 'N/A';
  return ((today - yesterday) / yesterday * 100).toFixed(1);
}
