// KV動的検索API - ワイルドカード検索対応
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, state } = req.query;

  if (action !== 'find-pkce' || !state) {
    return res.status(400).json({ error: 'action=find-pkce and state parameter required' });
  }

  console.log(`Dynamic PKCE search for state: ${state}`);

  try {
    // Redis KEYS コマンドでワイルドカード検索
    const pattern = `twitter_oauth_pkce:*:${state}`;

    const response = await fetch(`${process.env.KV_REST_API_URL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['KEYS', pattern]),
    });

    const result = await response.json();
    console.log('KEYS search result:', { pattern, result });

    if (!response.ok || !result.result || result.result.length === 0) {
      return res.json({
        action: 'find-pkce',
        state: state,
        pattern: pattern,
        found: false,
        keys: [],
        data: null
      });
    }

    // 最初に見つかったキーのデータを取得
    const foundKey = result.result[0];

    const dataResponse = await fetch(`${process.env.KV_REST_API_URL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['GET', foundKey]),
    });

    const dataResult = await dataResponse.json();
    console.log('Data retrieval result:', { key: foundKey, dataResult });

    return res.json({
      action: 'find-pkce',
      state: state,
      pattern: pattern,
      found: true,
      keys: result.result,
      matchedKey: foundKey,
      data: dataResult.result
    });

  } catch (error) {
    console.error('Dynamic PKCE search error:', error);
    return res.status(500).json({
      action: 'find-pkce',
      state: state,
      error: error.message
    });
  }
}