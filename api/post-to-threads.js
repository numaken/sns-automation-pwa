// プレミアムプランチェック関数（Twitter投稿APIと同様）
async function getUserPlan(userId) {
  try {
    // 既存のcheck-user-plan.jsを使用
    const response = await fetch(`${process.env.VERCEL_URL || 'https://sns-automation-pwa.vercel.app'}/api/check-user-plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userId}`,
      },
      body: JSON.stringify({ userId }),
    });
    
    if (!response.ok) {
      return 'free'; // デフォルトは無料プラン
    }
    
    const data = await response.json();
    return data.plan || 'free';
  } catch (error) {
    console.error('Plan check error:', error);
    return 'free';
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { content, accessToken } = req.body;
    
    // 認証チェック（既存）
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization required' });
    }
    
    const token = authHeader.substring(7);
    const userId = token; // 簡略化、実際は適切なユーザーID取得
    
    // プレミアムプランチェック（仕様書通りの追加）
    const userPlan = await getUserPlan(userId);
    if (userPlan !== 'premium') {
      return res.status(403).json({
        error: 'プレミアムプラン限定機能です',
        upgrade_required: true,
        message: '直接Threads投稿はプレミアムプラン限定です。月額¥980でアップグレードしませんか？'
      });
    }

    // 必須パラメータチェック
    if (!content || !accessToken) {
      return res.status(400).json({ 
        error: '投稿内容とThreads認証情報が必要です' 
      });
    }

    // Threads API リクエスト（簡略版）
    const threadsResponse = await fetch('https://graph.threads.net/v1.0/me/threads', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        media_type: 'TEXT',
        text: content,
      }),
    });

    if (!threadsResponse.ok) {
      const errorData = await threadsResponse.json();
      throw new Error(errorData.error?.message || 'Threads API エラー');
    }

    const threadData = await threadsResponse.json();

    // 投稿を公開
    const publishResponse = await fetch(`https://graph.threads.net/v1.0/${threadData.id}/publish`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!publishResponse.ok) {
      const errorData = await publishResponse.json();
      throw new Error(errorData.error?.message || 'Threads公開エラー');
    }

    const publishData = await publishResponse.json();

    return res.status(200).json({
      success: true,
      threadId: publishData.id,
      message: 'Threadsに正常に投稿されました',
      premium_feature: true
    });

  } catch (error) {
    console.error('Threads post error:', error);
    
    // Threads API特有のエラーハンドリング
    if (error.message.includes('OAuthException')) {
      return res.status(403).json({
        error: 'Threads API認証エラー',
        details: 'アクセストークンを確認してください'
      });
    }
    
    if (error.message.includes('rate limit')) {
      return res.status(429).json({
        error: 'Threads API制限に達しました',
        details: 'しばらく待ってから再試行してください'
      });
    }

    return res.status(500).json({
      error: 'Threads投稿に失敗しました',
      details: error.message
    });
  }
}
