// Twitter OAuth2 トークンリフレッシュAPI
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // KVからリフレッシュトークンを取得
    const tokenKey = `twitter_token:${userId}`;
    const tokenResponse = await fetch(process.env.KV_REST_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['GET', tokenKey]),
    });

    const tokenResult = await tokenResponse.json();

    if (!tokenResult.result) {
      return res.status(404).json({
        error: 'No Twitter token found',
        action: 'Please connect your Twitter account'
      });
    }

    const tokenData = JSON.parse(tokenResult.result);
    const { refresh_token, username, user_id } = tokenData;

    if (!refresh_token) {
      return res.status(400).json({
        error: 'No refresh token available',
        action: 'Please reconnect your Twitter account'
      });
    }

    // Twitter OAuth2トークンリフレッシュ
    const clientCredentials = Buffer.from(
      `${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`
    ).toString('base64');

    const refreshResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${clientCredentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'grant_type': 'refresh_token',
        'refresh_token': refresh_token,
        'client_id': process.env.TWITTER_CLIENT_ID,
      }),
    });

    const refreshData = await refreshResponse.json();

    if (!refreshResponse.ok) {
      console.error('Token refresh failed:', refreshData);
      return res.status(refreshResponse.status).json({
        error: 'Failed to refresh token',
        details: refreshData.error_description || refreshData.error,
        action: 'Please reconnect your Twitter account'
      });
    }

    // 新しいトークンデータを準備
    const newTokenData = {
      access_token: refreshData.access_token,
      refresh_token: refreshData.refresh_token || refresh_token, // 新しいリフレッシュトークンまたは既存のものを使用
      token_type: refreshData.token_type,
      expires_at: new Date(Date.now() + (refreshData.expires_in * 1000)).toISOString(),
      user_id: user_id,
      username: username,
      updated_at: new Date().toISOString()
    };

    // KVに新しいトークンを保存（30日間）
    await fetch(process.env.KV_REST_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['SETEX', tokenKey, 2592000, JSON.stringify(newTokenData)]),
    });

    console.log(`Token refreshed successfully for user: ${username}`);

    return res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      user: {
        id: user_id,
        username: username
      },
      expires_at: newTokenData.expires_at
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}