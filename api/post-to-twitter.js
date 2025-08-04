// プレミアムプランチェック関数
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
    const { content, accessToken, accessTokenSecret } = req.body;
    
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
        message: '直接Twitter投稿はプレミアムプラン限定です。月額¥980でアップグレードしませんか？'
      });
    }

    // 必須パラメータチェック
    if (!content || !accessToken || !accessTokenSecret) {
      return res.status(400).json({ 
        error: '投稿内容とTwitter認証情報が必要です' 
      });
    }

    // 投稿文字数チェック
    if (content.length > 280) {
      return res.status(400).json({ 
        error: '投稿内容が280文字を超えています' 
      });
    }

    // Twitter API呼び出し（簡略版）
    const tweetResponse = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: content
      }),
    });

    if (!tweetResponse.ok) {
      const errorData = await tweetResponse.json();
      throw new Error(errorData.detail || 'Twitter API エラー');
    }

    const tweetData = await tweetResponse.json();

    return res.status(200).json({
      success: true,
      tweetId: tweetData.data?.id,
      message: 'Twitterに正常に投稿されました',
      premium_feature: true
    });

  } catch (error) {
    console.error('Twitter post error:', error);
    
    // Twitter API特有のエラーハンドリング
    if (error.message.includes('403') || error.message.includes('Forbidden')) {
      return res.status(403).json({
        error: 'Twitter API権限エラー',
        details: 'アプリケーションの権限設定を確認してください'
      });
    }
    
    if (error.message.includes('429') || error.message.includes('rate limit')) {
      return res.status(429).json({
        error: 'Twitter API制限に達しました',
        details: 'しばらく待ってから再試行してください'
      });
    }

    return res.status(500).json({
      error: 'Twitter投稿に失敗しました',
      details: error.message
    });
  }
}
