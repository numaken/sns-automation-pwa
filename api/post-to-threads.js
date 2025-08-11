// Threads投稿API - 引き継ぎ書類では「基盤実装済み」とされている機能
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { content, userId } = req.body;

    // プレミアムプランチェック
    const userPlan = await getUserPlan(userId);
    if (userPlan !== 'premium') {
      return res.status(403).json({
        error: 'プレミアムプラン限定機能です',
        upgrade_required: true
      });
    }

    if (!content || !userId) {
      return res.status(400).json({ error: 'コンテンツとユーザーIDが必要です' });
    }

    // Threads APIアクセストークンの取得
    const threadsToken = await getThreadsToken(userId);
    if (!threadsToken) {
      return res.status(401).json({
        error: 'Threadsアカウントが接続されていません',
        requires_auth: true
      });
    }

    // Threads API投稿エンドポイント
    const threadsApiUrl = `https://graph.threads.net/v1.0/${process.env.THREADS_USER_ID}/threads`;

    // 投稿の作成
    const createResponse = await fetch(threadsApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${threadsToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        media_type: 'TEXT',
        text: content
      })
    });

    const createData = await createResponse.json();

    if (!createResponse.ok) {
      console.error('Threads create error:', createData);
      return res.status(createResponse.status).json({
        error: 'Threads投稿の作成に失敗しました',
        details: createData.error?.message
      });
    }

    // 投稿の公開
    const publishResponse = await fetch(`${threadsApiUrl}_publish`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${threadsToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        creation_id: createData.id
      })
    });

    const publishData = await publishResponse.json();

    if (!publishResponse.ok) {
      console.error('Threads publish error:', publishData);
      return res.status(publishResponse.status).json({
        error: 'Threads投稿の公開に失敗しました',
        details: publishData.error?.message
      });
    }

    // 投稿履歴の保存
    await savePostHistory(userId, 'threads', content, publishData.id);

    return res.status(200).json({
      success: true,
      platform: 'threads',
      postId: publishData.id,
      message: 'Threadsに投稿しました',
      url: `https://threads.net/@${process.env.THREADS_USERNAME}/post/${publishData.id}`
    });

  } catch (error) {
    console.error('Threads API error:', error);
    return res.status(500).json({
      error: 'Threads投稿でエラーが発生しました',
      details: error.message
    });
  }
}

// ヘルパー関数群
async function getUserPlan(userId) {
  // プラン確認ロジック（既存のcheck-user-plan.jsと統合）
  const plan = localStorage?.getItem?.('userPlan') || 'free';
  return plan;
}

async function getThreadsToken(userId) {
  try {
    // KVストレージからThreadsトークンを取得
    const response = await fetch(`${process.env.KV_REST_API_URL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['GET', `threads_token:${userId}`]),
    });

    const result = await response.json();
    return result.result;
  } catch (error) {
    console.error('Failed to get Threads token:', error);
    return null;
  }
}

async function savePostHistory(userId, platform, content, postId) {
  try {
    const historyKey = `post_history:${userId}:${Date.now()}`;
    const postData = {
      platform,
      content,
      postId,
      timestamp: new Date().toISOString(),
      userId
    };

    await fetch(`${process.env.KV_REST_API_URL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['SETEX', historyKey, 86400 * 30, JSON.stringify(postData)]), // 30日間保存
    });
  } catch (error) {
    console.error('Failed to save post history:', error);
  }
}