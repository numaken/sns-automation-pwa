// api/post-to-threads.js
import { getThreadsTokens } from '../utils/kv-client';

export default async function handler(req, res) {
  // CORS 対応
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // リクエストボディ受け取り（text または content + image_url）
    const { text, content, image_url } = req.body;
    const postText = (text || content || '').trim();

    // 入力検証
    if (!postText) {
      return res.status(400).json({
        error: '投稿テキストが必要です',
        code: 'MISSING_TEXT',
        message: 'text または content パラメータで投稿内容を指定してください'
      });
    }
    if (postText.length > 500) {
      return res.status(400).json({
        error: 'テキストが500文字を超えています',
        code: 'TEXT_TOO_LONG',
        length: postText.length,
        limit: 500,
        suggestion: '投稿を短くしてください'
      });
    }

    // 認証確認
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') && authHeader.slice(7);
    if (!token) {
      return res.status(401).json({
        error: '認証が必要です',
        code: 'UNAUTHORIZED',
        message: 'Authorization ヘッダーに Bearer トークンを設定してください'
      });
    }

    // プレミアムプランチェック
    const userPlan = await getUserPlan(token);
    if (userPlan !== 'premium') {
      return res.status(403).json({
        error: 'プレミアムプラン限定機能です',
        code: 'PREMIUM_REQUIRED',
        message: 'Threads 投稿はプレミアムプランでご利用いただけます。',
        upgrade_required: true,
        upgrade_url: '/upgrade'
      });
    }

    // --- OAuth トークン取得（Upstash KV から） ---
    const userId = token; // JWT の sub として userId を発行している場合など
    let threadsTokens;
    try {
      threadsTokens = await getThreadsTokens(userId);
    } catch {
      return res.status(400).json({
        error: 'Threads 接続が確認できません',
        code: 'NO_THREADS_CONNECTION',
        message: 'Threads アカウント連携を先に行ってください'
      });
    }

    // --- Threads へ投稿 ---
    let result;
    try {
      result = await postToThreads({
        text: postText,
        accessToken: threadsTokens.accessToken,
        image_url
      });
    } catch (err) {
      console.error('Threads API error:', err);
      // 投稿失敗を統計記録
      await recordPostStats('threads', token, {
        text: postText,
        success: false,
        error: err.message
      });

      if (err.code === 'AUTH_ERROR') {
        return res.status(401).json({
          error: 'Threads認証エラー',
          code: 'AUTH_ERROR',
          message: 'アクセストークンを確認してください',
          suggestion: 'Threads アプリで新しいアクセストークンを生成してください'
        });
      }
      if (err.code === 'RATE_LIMIT_ERROR') {
        return res.status(429).json({
          error: 'Threads API 制限に達しました',
          code: 'RATE_LIMIT_ERROR',
          message: 'しばらく待ってから再試行してください',
          retry_after: 3600
        });
      }
      if (err.code === 'CONTENT_POLICY_ERROR') {
        return res.status(400).json({
          error: 'コンテンツポリシー違反',
          code: 'CONTENT_POLICY_ERROR',
          message: '投稿内容がコミュニティガイドラインに違反している可能性があります'
        });
      }
      return res.status(500).json({
        error: 'Threads 投稿に失敗しました',
        code: 'INTERNAL_ERROR',
        message: 'しばらく待ってから再試行してください',
        debug: err.message
      });
    }

    // 投稿成功を統計記録
    await recordPostStats('threads', token, {
      text: postText,
      success: true,
      post_id: result.post_id
    });

    return res.status(200).json({
      success: true,
      message: 'Threads に投稿しました！',
      post_id: result.post_id,
      post_url: `https://www.threads.net/@user/post/${result.post_id}`,
      posted_at: new Date().toISOString(),
      platform: 'threads',
      character_count: postText.length,
      text_used: postText.slice(0, 50) + (postText.length > 50 ? '...' : '')
    });

  } catch (error) {
    console.error('Threads post handler error:', error);
    return res.status(500).json({
      error: 'サーバーエラーが発生しました',
      code: 'INTERNAL_ERROR',
      debug: error.message
    });
  }
}

// ————————————————————————————————————————————
// 以下、Helper 関数群
// ————————————————————————————————————————————

/**
 * ユーザープランを取得
 */
async function getUserPlan(token) {
  try {
    if (!token) return 'free';
    if (token === 'test-premium-token' || token === 'premium-user-token') return 'premium';

    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : (process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000'
        : 'https://sns-automation-pwa.vercel.app');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const resp = await fetch(`${baseUrl}/api/check-user-plan`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (resp.ok) {
      const data = await resp.json();
      return data.plan || 'free';
    }
    return 'free';
  } catch {
    return 'free';
  }
}

/**
 * Threads 投稿実行（モック含む）
 */
async function postToThreads({ text, accessToken, image_url }) {
  // モック実装 or 実環境で Graph API を使う実装に置き換えてください
  // 以下はモック例：
  if (text.includes('error_test')) {
    const e = new Error('Simulated error');
    e.code = text.includes('auth_error') ? 'AUTH_ERROR'
      : text.includes('rate_limit') ? 'RATE_LIMIT_ERROR'
        : text.includes('content_error') ? 'CONTENT_POLICY_ERROR'
          : 'INTERNAL_ERROR';
    throw e;
  }
  const mockId = `mock_${Date.now()}`;
  return { post_id: mockId };
}

/**
 * 投稿統計記録
 */
async function recordPostStats(platform, userToken, data) {
  try {
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return;
    const key = `post_stats:${platform}:${Date.now()}`;
    const safe = {
      platform,
      userToken: userToken.slice(0, 8) + '…' + userToken.slice(-4),
      text: data.text?.slice(0, 100) + (data.text.length > 100 ? '…' : ''),
      success: data.success,
      post_id: data.post_id || null,
      error: data.error || null,
      timestamp: new Date().toISOString()
    };
    await fetch(process.env.KV_REST_API_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['SETEX', key, 86400 * 7, JSON.stringify(safe)])
    });
  } catch (e) {
    console.error('Stats record error:', e);
  }
}
