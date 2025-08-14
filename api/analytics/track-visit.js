// PostPilot Pro - 最小限テスト版（KVなし）
// FUNCTION_INVOCATION_FAILED 原因特定用

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

  // 🧪 最小限の処理でテスト
  try {
    console.log('[Analytics] Minimal test handler called');
    
    res.status(200).json({ 
      tracked: true, 
      timestamp: new Date().toISOString(),
      status: 'minimal_test',
      received_data: req.body || {}
    });

  } catch (error) {
    console.log('[Analytics] Minimal handler error:', error.message);
    res.status(200).json({ 
      tracked: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
