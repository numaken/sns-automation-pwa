// PostPilot Pro - 最小限テスト版統計API
// FUNCTION_INVOCATION_FAILED 原因特定用

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
    console.log('[Analytics] Minimal stats handler called');
    
    // 🧪 KVを使わない最小限のレスポンス
    const analytics = {
      summary: {
        total_visits: 42, // テスト用固定値
        today_visits: 7,
        yesterday_visits: 5,
        growth_rate: '40.0'
      },
      hourly_breakdown: Array.from({length: 24}, (_, hour) => ({
        hour, 
        visits: Math.floor(Math.random() * 3) // ランダムテストデータ
      })),
      generated_at: new Date().toISOString(),
      status: 'minimal_test_mode'
    };

    res.status(200).json(analytics);

  } catch (error) {
    console.log('[Analytics] Minimal stats error:', error.message);
    res.status(200).json({
      error: error.message,
      generated_at: new Date().toISOString(),
      status: 'error_fallback'
    });
  }
}
