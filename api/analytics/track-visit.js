// PostPilot Pro - 基本アクセス記録
export default async function handler(req, res) {
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
    // 基本アクセスログ記録
    const data = req.body || {};
    console.log('[Analytics] Visit tracked:', {
      page: data.page,
      utm_source: data.utm_source,
      timestamp: data.timestamp
    });
    
    res.status(200).json({ 
      tracked: true, 
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(200).json({ 
      tracked: false, 
      timestamp: new Date().toISOString()
    });
  }
}
