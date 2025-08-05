// api/admin/reset-daily-limits.js - 緊急用制限リセットAPI

/**
 * 緊急用: 日次制限をリセットするAPI
 * 使用例: curl -X POST -H "x-admin-key: sns-automation-admin-2024" \
 *           https://sns-automation-pwa.vercel.app/api/admin/reset-daily-limits
 */

// KV REST APIクライアント関数
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

    const result = await response.json();
    return result.result;
  } catch (error) {
    console.error('KV GET error:', error);
    return null;
  }
}

async function deleteKVKey(key) {
  try {
    const response = await fetch(`${process.env.KV_REST_API_URL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['DEL', key]),
    });

    const result = await response.json();
    return result.result;
  } catch (error) {
    console.error('KV DELETE error:', error);
    return 0;
  }
}

async function scanKVKeys(pattern) {
  try {
    const response = await fetch(`${process.env.KV_REST_API_URL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['KEYS', pattern]),
    });

    const result = await response.json();
    return result.result || [];
  } catch (error) {
    console.error('KV KEYS error:', error);
    return [];
  }
}

export default async function handler(req, res) {
  // 管理者認証
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: '管理者キーが必要です'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'POST method required'
    });
  }

  try {
    const today = new Date().toISOString().split('T')[0];

    // 今日の制限キーをすべて取得
    const dailyUsageKeys = await scanKVKeys(`daily_usage:*:${today}`);

    // 制限キーを削除
    let deletedCount = 0;
    for (const key of dailyUsageKeys) {
      const result = await deleteKVKey(key);
      if (result > 0) {
        deletedCount++;
      }
    }

    // コストキーもリセット（オプション）
    const costKey = `daily_cost:${today}`;
    await deleteKVKey(costKey);

    // 緊急停止フラグもリセット
    const emergencyKey = `emergency_stop:${today}`;
    await deleteKVKey(emergencyKey);

    console.log(`✅ Daily limits reset: ${deletedCount} keys deleted`);

    return res.json({
      success: true,
      message: '日次制限をリセットしました',
      details: {
        date: today,
        deleted_usage_keys: deletedCount,
        reset_cost: true,
        reset_emergency_stop: true
      },
      notice: 'すべてのユーザーが再び3回まで生成可能です'
    });

  } catch (error) {
    console.error('Reset limits error:', error);
    return res.status(500).json({
      error: 'Reset failed',
      message: '制限リセットに失敗しました',
      details: error.message
    });
  }
}