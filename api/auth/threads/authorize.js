// Threads OAuth - 認証開始
import crypto from 'crypto';

// KVにデータを保存
async function setKVValue(key, value, ttl = 3600) {
  const response = await fetch(`${process.env.KV_REST_API_URL}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(['SETEX', key, ttl, JSON.stringify(value)]),
  });

  if (!response.ok) {
    throw new Error(`KV set error: ${response.status}`);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // State生成（CSRF保護）
    const state = crypto.randomBytes(16).toString('hex');

    // セッション情報をKVに保存（1時間有効）
    const sessionData = {
      userId,
      state,
      platform: 'threads',
      createdAt: new Date().toISOString()
    };

    await setKVValue(`oauth_session:${state}`, sessionData, 3600);

    // Threads OAuth認証URL生成
    const authParams = new URLSearchParams({
      client_id: process.env.THREADS_APP_ID,
      redirect_uri: `${process.env.VERCEL_URL || 'https://sns-automation-pwa.vercel.app'}/api/auth/threads/callback`,
      scope: 'threads_basic,threads_content_publish',
      response_type: 'code',
      state: state
    });

    const authUrl = `https://threads.net/oauth/authorize?${authParams.toString()}`;

    return res.status(200).json({
      success: true,
      authUrl,
      state,
      message: 'Threads認証を開始してください'
    });

  } catch (error) {
    console.error('Threads OAuth authorize error:', error);
    return res.status(500).json({
      error: 'OAuth認証の開始に失敗しました',
      details: error.message
    });
  }
}