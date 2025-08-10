// /api/admin/reset-daily-limits.js (完全修正版)
// 制限システムの強制リセット機能

export default async function handler(req, res) {
  const adminKey = req.headers['x-admin-key'];

  if (adminKey !== 'sns-automation-admin-2024') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const { ip } = req.query; // 特定IP指定

    const results = {
      timestamp: new Date().toISOString(),
      date: today,
      resetCount: 0,
      deletedKeys: [],
      errors: []
    };

    // 特定IPのリセット
    if (ip) {
      console.log('🎯 Resetting specific IP:', ip);

      const specificKeys = [
        `daily_usage:${ip}:${today}`,
        `daily_usage:${ip}:${yesterday}`
      ];

      for (const key of specificKeys) {
        try {
          const deleted = await deleteKVKey(key);
          if (deleted > 0) {
            results.deletedKeys.push(key);
            results.resetCount++;
            console.log('✅ Deleted:', key);
          }
        } catch (error) {
          results.errors.push({ key, error: error.message });
          console.error('❌ Delete error:', key, error.message);
        }
      }
    } else {
      // 全体リセット
      console.log('🔄 Full reset starting...');

      // 一般的なパターンで削除
      const commonPatterns = [
        `daily_cost:${today}`,
        `daily_cost:${yesterday}`,
        `emergency_stop:${today}`,
        `emergency_stop:${yesterday}`
      ];

      for (const key of commonPatterns) {
        try {
          const deleted = await deleteKVKey(key);
          if (deleted > 0) {
            results.deletedKeys.push(key);
            results.resetCount++;
            console.log('✅ Deleted:', key);
          }
        } catch (error) {
          results.errors.push({ key, error: error.message });
        }
      }

      // daily_usage パターンの一括削除
      try {
        const usageKeys = await getAllUsageKeys(today, yesterday);
        for (const key of usageKeys) {
          try {
            const deleted = await deleteKVKey(key);
            if (deleted > 0) {
              results.deletedKeys.push(key);
              results.resetCount++;
            }
          } catch (error) {
            results.errors.push({ key, error: error.message });
          }
        }
      } catch (error) {
        results.errors.push({ operation: 'bulk_usage_delete', error: error.message });
      }
    }

    console.log('🎉 Reset completed:', results);

    return res.json({
      success: true,
      message: ip ? `IP ${ip} reset completed` : 'Full reset completed',
      details: results,
      next_steps: ip ? 'Test with this IP now' : 'System ready for new usage'
    });

  } catch (error) {
    console.error('❌ Reset error:', error);
    return res.status(500).json({
      error: 'Reset failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

// KVキー削除（改良版）
async function deleteKVKey(key) {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    throw new Error('KV environment variables not configured');
  }

  console.log('🗑️ Attempting to delete:', key);

  const response = await fetch(process.env.KV_REST_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(['DEL', key]),
  });

  if (!response.ok) {
    throw new Error(`KV DEL failed: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  console.log('🗑️ Delete result for', key, ':', result.result);
  return result.result; // 削除されたキーの数
}

// 使用量キーの一括取得
async function getAllUsageKeys(today, yesterday) {
  const keys = [];

  try {
    // SCAN コマンドで daily_usage:* パターンを検索
    const todayPattern = `daily_usage:*:${today}`;
    const yesterdayPattern = `daily_usage:*:${yesterday}`;

    const todayKeys = await scanKeys(todayPattern);
    const yesterdayKeys = await scanKeys(yesterdayPattern);

    keys.push(...todayKeys, ...yesterdayKeys);

    console.log('📋 Found usage keys:', keys);
  } catch (error) {
    console.error('Key scan error:', error);
  }

  return keys;
}

// KVキー検索
async function scanKeys(pattern) {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    throw new Error('KV environment variables not configured');
  }

  try {
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
    console.error('Scan error for pattern', pattern, ':', error);
    return [];
  }
}