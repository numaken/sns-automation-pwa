// api/post-to-twitter.js
async function getTwitterTokens(userId) {
  const resp = await fetch(`${process.env.KV_REST_API_URL}/get/twitter_tokens:${userId}`, {
    headers: { 'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}` }
  });
  if (!resp.ok) throw new Error('NO_TWITTER_CONNECTION');
  return resp.json();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { text, media_urls } = req.body;
    const postText = (text || '').trim();
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'UNAUTHORIZED' });

    if (!postText) return res.status(400).json({ error: 'MISSING_TEXT' });
    if (postText.length > 280) return res.status(400).json({ error: 'TEXT_TOO_LONG' });

    // KVからOAuthトークン取得
    let twitterTokens;
    try {
      twitterTokens = await getTwitterTokens(token);
    } catch {
      return res.status(400).json({ error: 'NO_TWITTER_CONNECTION', message: 'Twitter連携を先に行ってください' });
    }

    // --- 実際の投稿処理（モック） ---
    const tweetId = `mock_${Date.now()}`;
    const tweetUrl = `https://twitter.com/user/status/${tweetId}`;

    res.status(200).json({
      success: true,
      tweet_id: tweetId,
      tweet_url: tweetUrl,
      posted_at: new Date().toISOString()
    });

  } catch (e) {
    console.error('Twitter post error:', e);
    res.status(500).json({ error: 'INTERNAL_ERROR', details: e.message });
  }
}
