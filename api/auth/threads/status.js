// Threads OAuth接続状態確認API

// KVからデータを取得
async function getKVValue(key) {
  const response = await fetch(`${process.env.KV_REST_API_URL}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(['GET', key]),
  });

  if (!response.ok) {
    throw new Error(`KV get error: ${response.status}`);
  }

  const data = await response.json();
  return data.result ? JSON.parse(data.result) : null;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // ユーザーのThreadsトークンを確認
    const tokenInfo = await getKVValue(`threads_token:${userId}`);

    if (!tokenInfo) {
      return res.status(404).json({
        connected: false,
        message: 'Threadsアカウントが接続されていません'
      });
    }

    // トークンの有効期限をチェック
    const expiresAt = new Date(tokenInfo.expiresAt);
    const now = new Date();
    const isExpired = now >= expiresAt;

    return res.status(200).json({
      connected: true,
      username: tokenInfo.threadsUsername,
      userId: tokenInfo.threadsUserId,
      profilePictureUrl: tokenInfo.profilePictureUrl,
      connectedAt: tokenInfo.connectedAt,
      expiresAt: tokenInfo.expiresAt,
      isExpired: isExpired,
      platform: 'threads'
    });

  } catch (error) {
    console.error('Threads status check error:', error);
    return res.status(500).json({
      error: 'Threads接続状態の確認に失敗しました',
      connected: false
    });
  }
}