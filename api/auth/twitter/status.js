// api/auth/twitter/status.js - Twitter接続状態確認API
export default async function handler(req, res) {
  console.log('=== Twitter Status Check START ===');
  console.log('Method:', req.method);
  console.log('Body:', req.body);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    console.log('Checking Twitter connection for userId:', userId);

    // KVストレージからTwitterトークンを確認
    const tokenKey = `twitter_token:${userId}`;
    const tokenData = await getKVValue(tokenKey);

    console.log('Twitter token check:', { key: tokenKey, hasToken: !!tokenData });

    if (tokenData) {
      // トークンが存在する場合、詳細情報も取得
      const userInfoKey = `twitter_user:${userId}`;
      const userInfo = await getKVValue(userInfoKey);

      let userData = null;
      if (userInfo) {
        try {
          userData = JSON.parse(userInfo);
        } catch (e) {
          console.log('Failed to parse user info, using default');
        }
      }

      console.log('Twitter connection confirmed:', {
        userId,
        username: userData?.username || 'Connected User',
        connectedAt: userData?.connectedAt
      });

      return res.status(200).json({
        connected: true,
        username: userData?.username || 'Connected User',
        connectedAt: userData?.connectedAt,
        platform: 'twitter'
      });
    }

    console.log('Twitter not connected for userId:', userId);
    return res.status(200).json({
      connected: false,
      platform: 'twitter'
    });

  } catch (error) {
    console.error('Twitter status check error:', error);
    return res.status(500).json({
      error: 'Status check failed',
      platform: 'twitter',
      details: error.message
    });
  }
}

// KVストレージヘルパー関数
async function getKVValue(key) {
  try {
    console.log(`KV GET request for key: ${key}`);

    const response = await fetch(`${process.env.KV_REST_API_URL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['GET', key]),
    });

    const result = await response.json();
    console.log(`KV GET response for ${key}:`, {
      status: response.status,
      hasResult: !!result.result
    });

    if (!response.ok) {
      console.error(`KV GET failed for ${key}:`, result);
      return null;
    }

    return result.result;
  } catch (error) {
    console.error(`KV GET error for ${key}:`, error);
    return null;
  }
}