// 一時的な制限リセットAPI - api/admin/reset-limits.js
export default async function handler(req, res) {
  const adminKey = req.headers['x-admin-key'];

  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const today = new Date().toISOString().split('T')[0];

    // 今日の全ての制限データをクリア
    const keysToDelete = [
      `daily_cost:${today}`,
      `daily_users:${today}`,
      `daily_generations:${today}`,
      `emergency_stop:${today}`
    ];

    // IP別制限をクリア（一般的なパターン）
    const ipPatterns = [
      `daily_usage:unknown:${today}`,
      `daily_usage:127.0.0.1:${today}`,
      `daily_usage:::1:${today}`
    ];

    const allKeys = [...keysToDelete, ...ipPatterns];

    // 各キーを削除
    let deletedCount = 0;
    for (const key of allKeys) {
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
          if (result.result > 0) deletedCount++;
        }
      } catch (error) {
        console.error(`Failed to delete ${key}:`, error);
      }
    }

    return res.json({
      status: 'SUCCESS',
      message: 'Daily limits reset successfully',
      deleted_keys: deletedCount,
      reset_date: today,
      note: 'All users can now generate up to 3 posts again today'
    });

  } catch (error) {
    console.error('Reset limits error:', error);
    return res.status(500).json({
      error: 'Reset failed',
      debug: error.message
    });
  }
}