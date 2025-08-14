// PostPilot Pro - 修正版アナリティクス統計取得
// エラー耐性強化

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

    // 🔍 安全な並行読み取り
    const results = await Promise.allSettled([
      kv.get(`${prefix}total`),
      kv.get(`${prefix}daily_${today}`),
      kv.get(`${prefix}daily_${yesterday}`),
      getHourlyStatsSafe(prefix, today)
    ]);

    // 📊 安全なデータ整形
    const analytics = {
      summary: {
        total_visits: getSafeValue(results[0]) || 0,
        today_visits: getSafeValue(results[1]) || 0,
        yesterday_visits: getSafeValue(results[2]) || 0,
        growth_rate: calculateGrowthRate(
          getSafeValue(results[1]) || 0,
          getSafeValue(results[2]) || 0
        )
      },
      hourly_breakdown: getSafeValue(results[3]) || generateEmptyHourly(),
      generated_at: new Date().toISOString(),
      status: 'operational'
    };

    res.status(200).json(analytics);

  } catch (error) {
    // 🛡️ エラー時も安全なレスポンス
    console.log('[Analytics] get-stats error:', error.message);
    res.status(200).json({
      summary: { 
        total_visits: 0, 
        today_visits: 0, 
        yesterday_visits: 0,
        growth_rate: 'N/A'
      },
      hourly_breakdown: generateEmptyHourly(),
      error: 'safe_fallback',
      generated_at: new Date().toISOString(),
      status: 'fallback_mode'
    });
  }
}

async function getHourlyStatsSafe(prefix, date) {
  try {
    const hourlyPromises = Array.from({length: 24}, (_, hour) => 
      kv.get(`${prefix}hourly_${date}_${hour}`)
    );
    
    const hourlyResults = await Promise.allSettled(hourlyPromises);
    
    return hourlyResults.map((result, hour) => ({
      hour,
      visits: getSafeValue(result) || 0
    }));
  } catch (error) {
    console.log('[Analytics] getHourlyStatsSafe error:', error.message);
    return generateEmptyHourly();
  }
}

function getSafeValue(settledPromise) {
  if (settledPromise && settledPromise.status === 'fulfilled') {
    return settledPromise.value;
  }
  return null;
}

function calculateGrowthRate(today, yesterday) {
  if (yesterday === 0) return 'N/A';
  return ((today - yesterday) / yesterday * 100).toFixed(1);
}

function generateEmptyHourly() {
  return Array.from({length: 24}, (_, hour) => ({hour, visits: 0}));
}
