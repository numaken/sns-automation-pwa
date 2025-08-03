// 緊急IP診断API - api/admin/debug-ip.js
export default async function handler(req, res) {
  const adminKey = req.headers['x-admin-key'];

  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const today = new Date().toISOString().split('T')[0];

    // クライアントIP取得（同じロジック）
    function getClientIP(req) {
      return req.headers['x-forwarded-for']?.split(',')[0] ||
        req.headers['x-real-ip'] ||
        req.connection.remoteAddress ||
        'unknown';
    }

    const clientIP = getClientIP(req);
    const usageKey = `daily_usage:${clientIP}:${today}`;

    // 現在の使用量確認
    const currentUsage = await getKVValue(usageKey);

    // 存在する全てのキーパターンを確認
    const commonIPs = [
      'unknown',
      '127.0.0.1',
      '::1',
      '0.0.0.0',
      clientIP
    ];

    const keyResults = {};
    for (const ip of commonIPs) {
      const key = `daily_usage:${ip}:${today}`;
      const value = await getKVValue(key);
      if (value !== null) {
        keyResults[key] = value;
      }
    }

    return res.json({
      debug_info: {
        date: today,
        detected_client_ip: clientIP,
        usage_key: usageKey,
        current_usage: currentUsage,
        headers: {
          'x-forwarded-for': req.headers['x-forwarded-for'],
          'x-real-ip': req.headers['x-real-ip'],
          'cf-connecting-ip': req.headers['cf-connecting-ip']
        },
        existing_usage_keys: keyResults,
        total_existing_keys: Object.keys(keyResults).length
      },
      recommendation: Object.keys(keyResults).length > 0
        ? `Delete these keys: ${Object.keys(keyResults).join(', ')}`
        : "No usage keys found - should be able to generate"
    });

  } catch (error) {
    console.error('IP debug error:', error);
    return res.status(500).json({
      error: 'Debug failed',
      debug: error.message
    });
  }
}

// KV取得関数（共通）
async function getKVValue(key) {
  try {
    const response = await fetch(`${process.env.KV_REST_API_URL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['GET', key]),
    });

    if (!response.ok) {
      throw new Error(`KV API error: ${response.status}`);
    }

    const data = await response.json();
    return data.result;
  } catch (error) {
    console.error('KV get error:', error);
    return null;
  }
}