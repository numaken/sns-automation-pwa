// /api/admin/reset-daily-limits.js (改善版)
// 制限システムの完全リセット機能

export default async function handler(req, res) {
  const adminKey = req.headers['x-admin-key'];

  if (adminKey !== 'sns-automation-admin-2024') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // リセット対象のパターン取得
    const patterns = [
      `daily_usage:*:${today}`,
      `daily_usage:*:${yesterday}`,
      `daily_cost:${today}`,
      `daily_cost:${yesterday}`,
      `emergency_stop:${today}`,
      `emergency_stop:${yesterday}`
    ];

    const results = {
      timestamp: new Date().toISOString(),
      patterns_checked: patterns,
      keys_deleted: [],
      errors: []
    };

    // 各パターンのキーを検索・削除
    for (const pattern of patterns) {
      try {
        const keys = await scanKVKeys(pattern);

        for (const key of keys) {
          try {
            await deleteKVKey(key);
            results.keys_deleted.push(key);
            console.log('🗑️ Deleted key:', key);
          } catch (error) {
            results.errors.push({
              key,
              error: error.message
            });
          }
        }
      } catch (error) {
        results.errors.push({
          pattern,
          error: error.message
        });
      }
    }

    // 特定IPの強制リセット（URLパラメータで指定可能）
    const { ip } = req.query;
    if (ip) {
      const specificKeys = [
        `daily_usage:${ip}:${today}`,
        `daily_usage:${ip}:${yesterday}`
      ];

      for (const key of specificKeys) {
        try {
          await deleteKVKey(key);
          results.keys_deleted.push(key);
          console.log('🎯 Force deleted key:', key);
        } catch (error) {
          results.errors.push({
            key,
            error: error.message
          });
        }
      }
    }

    console.log('✅ Reset completed:', results);

    return res.json({
      success: true,
      message: 'Daily limits reset completed',
      details: results,
      usage: 'Add ?ip=<IP_ADDRESS> to reset specific IP'
    });

  } catch (error) {
    console.error('❌ Reset error:', error);
    return res.status(500).json({
      error: 'Reset failed',
      message: error.message
    });
  }
}

// KVキー検索（パターンマッチ）
async function scanKVKeys(pattern) {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    throw new Error('KV environment variables not configured');
  }

  try {
    // Redis KEYS コマンドでパターンマッチング
    const response = await fetch(process.env.KV_REST_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['KEYS', pattern]),
    });

    if (!response.ok) {
      throw new Error(`KV KEYS failed: ${response.status}`);
    }

    const result = await response.json();
    return result.result || [];
  } catch (error) {
    console.error('Key scan error:', error);
    return [];
  }
}

// KVキー削除
async function deleteKVKey(key) {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    throw new Error('KV environment variables not configured');
  }

  const response = await fetch(process.env.KV_REST_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(['DEL', key]),
  });

  if (!response.ok) {
    throw new Error(`KV DEL failed: ${response.status}`);
  }

  const result = await response.json();
  return result.result;
}