// api/admin/reset-limits.js - 制限データ直接削除API（緊急用）
export default async function handler(req, res) {
  // 管理者認証
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { target_ip } = req.body || {};
    const clientIP = target_ip || getClientIP(req);

    console.log(`🔄 Resetting limits for IP: ${clientIP}`);

    // 今日の日付
    const today = new Date().toISOString().split('T')[0];

    // 削除するキー一覧
    const keysToDelete = [
      `daily_usage:${clientIP}:${today}`,
      `daily_usage:${clientIP}:${getYesterday()}`,  // 昨日分も削除
      `emergency_stop:${today}`,
      `daily_cost:${today}`
    ];

    let deletedKeys = [];
    let errors = [];

    // 各キーを削除
    for (const key of keysToDelete) {
      try {
        const response = await fetch(`${process.env.KV_REST_API_URL}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(['DEL', key]),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.result > 0) {
            deletedKeys.push(key);
            console.log(`✅ Deleted: ${key}`);
          } else {
            console.log(`⚪ Not found: ${key}`);
          }
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        console.error(`❌ Error deleting ${key}:`, error);
        errors.push({ key, error: error.message });
      }
    }

    // 結果確認のため、現在の使用量をチェック
    const currentUsage = await checkCurrentUsage(clientIP);

    return res.status(200).json({
      success: true,
      message: '制限データをリセットしました',
      target_ip: clientIP,
      deleted_keys: deletedKeys,
      errors: errors,
      current_usage: currentUsage,
      reset_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Reset limits error:', error);
    return res.status(500).json({
      error: '制限リセットに失敗しました',
      debug: error.message
    });
  }
}

// ヘルパー関数
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.headers['cf-connecting-ip'] ||
    req.connection.remoteAddress ||
    'unknown';
}

function getYesterday() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

// 現在の使用量確認
async function checkCurrentUsage(clientIP) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const key = `daily_usage:${clientIP}:${today}`;

    const response = await fetch(`${process.env.KV_REST_API_URL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['GET', key]),
    });

    if (response.ok) {
      const data = await response.json();
      const usage = parseInt(data.result) || 0;
      return {
        key,
        usage,
        remaining: Math.max(0, 3 - usage)
      };
    }

    return { key, usage: 0, remaining: 3 };
  } catch (error) {
    console.error('Check usage error:', error);
    return { key: 'error', usage: 'unknown', remaining: 'unknown' };
  }
}