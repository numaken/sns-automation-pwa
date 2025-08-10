// /api/admin/debug-limits.js
// 制限システムの詳細診断API

export default async function handler(req, res) {
  const adminKey = req.headers['x-admin-key'];

  if (adminKey !== 'sns-automation-admin-2024') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const today = new Date().toISOString().split('T')[0];

    // テスト用のIP（実際のリクエストIPも確認）
    const testIP = '192.168.1.1';
    const clientIP = getClientIP(req);

    console.log('🔍 Debug Info:', {
      today,
      testIP,
      clientIP,
      kvUrl: process.env.KV_REST_API_URL ? 'Set' : 'Missing',
      kvToken: process.env.KV_REST_API_TOKEN ? 'Set' : 'Missing'
    });

    // 各種KVキーの確認
    const debugData = {
      date: today,
      environment: {
        kv_url_exists: !!process.env.KV_REST_API_URL,
        kv_token_exists: !!process.env.KV_REST_API_TOKEN,
        admin_key: !!process.env.ADMIN_KEY
      },
      ip_detection: {
        client_ip: clientIP,
        forwarded_for: req.headers['x-forwarded-for'],
        real_ip: req.headers['x-real-ip'],
        cf_connecting_ip: req.headers['cf-connecting-ip']
      },
      kv_keys_to_check: [
        `daily_usage:${clientIP}:${today}`,
        `daily_usage:${testIP}:${today}`,
        `daily_cost:${today}`,
        `emergency_stop:${today}`
      ]
    };

    // 実際のKVデータ取得
    const kvData = {};

    for (const key of debugData.kv_keys_to_check) {
      try {
        const value = await getKVValue(key);
        kvData[key] = {
          value: value,
          type: typeof value,
          exists: value !== null
        };
      } catch (error) {
        kvData[key] = {
          error: error.message,
          exists: false
        };
      }
    }

    debugData.kv_data = kvData;

    // 制限チェック関数のテスト
    try {
      const limitCheck = await checkDailyLimit(clientIP);
      debugData.limit_check = {
        result: limitCheck,
        ip_used: clientIP
      };
    } catch (error) {
      debugData.limit_check = {
        error: error.message
      };
    }

    return res.json(debugData);

  } catch (error) {
    console.error('Debug API error:', error);
    return res.status(500).json({
      error: 'Debug error',
      message: error.message,
      stack: error.stack
    });
  }
}

// IP取得関数
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.headers['cf-connecting-ip'] ||
    req.connection?.remoteAddress ||
    'unknown';
}

// KV取得関数
async function getKVValue(key) {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    throw new Error('KV environment variables not set');
  }

  const response = await fetch(process.env.KV_REST_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(['GET', key]),
  });

  if (!response.ok) {
    throw new Error(`KV GET failed: ${response.status}`);
  }

  const result = await response.json();
  return result.result;
}

// 制限チェック関数（既存のロジックと同じ）
async function checkDailyLimit(clientIP) {
  const DAILY_LIMIT = 3;
  const today = new Date().toISOString().split('T')[0];
  const key = `daily_usage:${clientIP}:${today}`;

  try {
    const usage = await getKVValue(key);
    const currentUsage = parseInt(usage) || 0;

    console.log('🔍 Limit Check:', {
      key,
      usage,
      currentUsage,
      limit: DAILY_LIMIT,
      allowed: currentUsage < DAILY_LIMIT
    });

    return currentUsage < DAILY_LIMIT;
  } catch (error) {
    console.error('Limit check error:', error);
    return true; // エラー時は許可（安全側に倒す）
  }
}