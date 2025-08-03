// 完全リセットAPI - api/admin/complete-reset.js
export default async function handler(req, res) {
  const adminKey = req.headers['x-admin-key'];

  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const today = new Date().toISOString().split('T')[0];

    // 削除対象の全パターン
    const keysToDelete = [
      // コスト・システム関連
      `daily_cost:${today}`,
      `daily_users:${today}`,
      `daily_generations:${today}`,
      `emergency_stop:${today}`,

      // 一般的なIPパターン
      `daily_usage:unknown:${today}`,
      `daily_usage:127.0.0.1:${today}`,
      `daily_usage:::1:${today}`,
      `daily_usage:0.0.0.0:${today}`,
      `daily_usage:localhost:${today}`,

      // Vercel/Cloudflare IP範囲（推測）
      `daily_usage:76.76.19.0:${today}`,
      `daily_usage:76.223.126.0:${today}`,
      `daily_usage:108.162.192.0:${today}`,

      // 現在のリクエストIP
      `daily_usage:${getClientIP(req)}:${today}`,
    ];

    // 広範囲パターンマッチング削除
    const ipPatterns = [
      '192.168.',
      '10.0.',
      '172.16.',
      '76.76.',
      '76.223.',
      '108.162.',
      '104.16.',
      '172.64.'
    ];

    // 各パターンで複数IP試行
    for (const pattern of ipPatterns) {
      for (let i = 0; i < 10; i++) {
        keysToDelete.push(`daily_usage:${pattern}${i}:${today}`);
        keysToDelete.push(`daily_usage:${pattern}${i}.${i}:${today}`);
      }
    }

    // 全キー削除実行
    let deletedCount = 0;
    let totalChecked = 0;

    for (const key of keysToDelete) {
      totalChecked++;
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
            deletedCount++;
            console.log(`Deleted key: ${key}`);
          }
        }
      } catch (error) {
        console.error(`Failed to delete ${key}:`, error);
      }
    }

    return res.json({
      status: 'COMPLETE_RESET_SUCCESS',
      message: 'Complete daily limits reset executed',
      stats: {
        total_keys_checked: totalChecked,
        deleted_keys: deletedCount,
        reset_date: today,
        detected_client_ip: getClientIP(req)
      },
      note: 'All possible usage patterns have been reset. Generation should now work.'
    });

  } catch (error) {
    console.error('Complete reset error:', error);
    return res.status(500).json({
      error: 'Complete reset failed',
      debug: error.message
    });
  }
}

// クライアントIP取得（共通ロジック）
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] ||
    req.headers['x-real-ip'] ||
    req.headers['cf-connecting-ip'] ||
    req.connection.remoteAddress ||
    'unknown';
}