// Twitter投稿API（OAuth認証済みユーザー用）
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { content, userId } = req.body;

    if (!content || !userId) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['content', 'userId']
      });
    }

    // 文字数制限チェック（Twitter: 280文字）
    if (content.length > 280) {
      return res.status(400).json({
        error: 'Content too long',
        current: content.length,
        limit: 280
      });
    }

    // KVからTwitterトークンを取得
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
      return res.status(401).json({
        error: 'Twitter account not connected',
        action: 'Please connect your Twitter account first'
      });
    }

    const tokenData = JSON.parse(tokenResult.result);
    const { access_token, expires_at, username, user_id } = tokenData;

    // トークン有効期限チェック
    if (new Date(expires_at) <= new Date()) {
      return res.status(401).json({
        error: 'Twitter token expired',
        action: 'Please reconnect your Twitter account'
      });
    }

    // Twitter API v2でツイート投稿
    const tweetResponse = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: content
      }),
    });

    const tweetData = await tweetResponse.json();

    if (!tweetResponse.ok) {
      console.error('Twitter API Error:', tweetData);

      // 詳細なエラーハンドリング
      if (tweetData.errors) {
        const errorDetails = tweetData.errors.map(err => err.detail || err.message).join(', ');
        return res.status(tweetResponse.status).json({
          error: 'Twitter API error',
          details: errorDetails,
          type: tweetData.type || 'unknown'
        });
      }

      return res.status(tweetResponse.status).json({
        error: 'Failed to post tweet',
        status: tweetResponse.status,
        message: tweetData.detail || tweetData.message || 'Unknown error'
      });
    }

    // 投稿成功
    const tweetId = tweetData.data.id;
    const tweetUrl = `https://twitter.com/${username}/status/${tweetId}`;

    // 投稿統計の記録
    const statKey = `twitter_post_stat:${userId}:${new Date().toISOString().split('T')[0]}`;
    await fetch(process.env.KV_REST_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['INCR', statKey]),
    });

    // TTL設定（7日間）
    await fetch(process.env.KV_REST_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['EXPIRE', statKey, 604800]),
    });

    return res.status(200).json({
      success: true,
      tweet: {
        id: tweetId,
        url: tweetUrl,
        text: content,
        user: {
          id: user_id,
          username: username
        }
      },
      message: 'Tweet posted successfully'
    });

  } catch (error) {
    console.error('Twitter post error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}