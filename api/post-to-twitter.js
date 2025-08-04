// プレミアム制限付きTwitter投稿API
import { TwitterApi } from 'twitter-api-v2';

// ユーザープラン取得関数（実装が必要）
async function getUserPlan(userId) {
  try {
    // Stripeサブスクリプション確認ロジック
    // 既存の認証システムと連携
    const response = await fetch(`${process.env.STRIPE_API_URL}/subscriptions`, {
      headers: {
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      },
    });

    const data = await response.json();

    // ユーザーのアクティブなサブスクリプションを確認
    const activeSubscription = data.find(sub =>
      sub.customer === userId &&
      sub.status === 'active'
    );

    return activeSubscription ? 'premium' : 'free';
  } catch (error) {
    console.error('User plan check error:', error);
    return 'free'; // エラー時はデフォルトで無料プラン
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { post, accessToken, accessTokenSecret, userId } = req.body;

    // 基本的な入力検証
    if (!post || !accessToken || !accessTokenSecret || !userId) {
      return res.status(400).json({
        error: '必要なパラメータが不足しています'
      });
    }

    // 既存の認証チェック後に追加
    // ユーザー認証（既存のロジックを維持）
    const authResult = await verifyUserAuth(userId, req.headers.authorization);
    if (!authResult.valid) {
      return res.status(401).json({ error: '認証に失敗しました' });
    }

    // プレミアムプランチェック
    const userPlan = await getUserPlan(userId);
    if (userPlan !== 'premium') {
      return res.status(403).json({
        error: 'プレミアムプラン限定機能です',
        upgrade_required: true,
        message: 'Twitter投稿機能はプレミアムプラン会員様限定です。アップグレードしてご利用ください。'
      });
    }

    // 既存の投稿処理は維持
    const client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
      accessToken,
      accessSecret: accessTokenSecret,
    });

    // 投稿実行
    const tweet = await client.v2.tweet(post);

    return res.status(200).json({
      success: true,
      tweetId: tweet.data.id,
      tweetUrl: `https://twitter.com/user/status/${tweet.data.id}`,
      message: 'ツイートが正常に投稿されました'
    });

  } catch (error) {
    console.error('Twitter post error:', error);

    // エラーの種類に応じた適切なレスポンス
    if (error.code === 401) {
      return res.status(401).json({
        error: 'Twitter認証に失敗しました',
        message: 'Twitterアカウントの連携を確認してください'
      });
    }

    if (error.code === 429) {
      return res.status(429).json({
        error: 'レート制限に達しました',
        message: 'しばらく時間をおいてから再試行してください'
      });
    }

    return res.status(500).json({
      error: 'Twitter投稿に失敗しました',
      message: '一時的なエラーが発生しました。しばらく待ってから再試行してください。'
    });
  }
}

// 既存の認証関数（維持）
async function verifyUserAuth(userId, authHeader) {
  try {
    // 既存の認証ロジックを維持
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return { valid: false };
    }

    // JWTトークン検証やセッション確認など
    // 既存のシステムに合わせて実装
    return { valid: true, userId };

  } catch (error) {
    console.error('Auth verification error:', error);
    return { valid: false };
  }
}