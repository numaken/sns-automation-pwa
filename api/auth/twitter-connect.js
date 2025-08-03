// /api/auth/twitter-connect.js - Twitter連携API
import { TwitterApi } from 'twitter-api-v2';

const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.body;

  try {
    // Step 1: OAuth認証URLを生成
    const authLink = await twitterClient.generateAuthLink(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/twitter-callback`,
      { linkMode: 'authorize' }
    );

    // Step 2: 一時的な認証データを保存（Redis/Database）
    await saveTemporaryAuthData(authLink.oauth_token, {
      userId: userId,
      oauth_token_secret: authLink.oauth_token_secret,
      timestamp: Date.now()
    });

    return res.json({
      authUrl: authLink.url,
      oauth_token: authLink.oauth_token
    });

  } catch (error) {
    console.error('Twitter auth error:', error);
    return res.status(500).json({
      error: 'Twitter認証の準備に失敗しました'
    });
  }
}

// /api/auth/twitter-callback.js - Twitter認証コールバック
export default async function handler(req, res) {
  const { oauth_token, oauth_verifier } = req.query;

  try {
    // Step 1: 一時認証データを取得
    const tempData = await getTemporaryAuthData(oauth_token);

    // Step 2: アクセストークンを取得
    const userClient = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
      accessToken: oauth_token,
      accessSecret: tempData.oauth_token_secret,
    });

    const { accessToken, accessSecret, screenName, userId } =
      await userClient.login(oauth_verifier);

    // Step 3: ユーザー情報を取得
    const twitterUser = await userClient.v2.me();

    // Step 4: 暗号化してデータベースに保存
    await saveUserSNSConnection(tempData.userId, {
      platform: 'twitter',
      accessToken: encrypt(accessToken),
      accessSecret: encrypt(accessSecret),
      screenName: screenName,
      twitterUserId: twitterUser.data.id,
      profileImage: twitterUser.data.profile_image_url,
      connectedAt: new Date().toISOString()
    });

    // Step 5: 成功ページにリダイレクト
    return res.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?connected=twitter`);

  } catch (error) {
    console.error('Twitter callback error:', error);
    return res.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?error=twitter_failed`);
  }
}

// /api/post-to-twitter.js - Twitter投稿API
export default async function handler(req, res) {
  const { userId, content } = req.body;

  try {
    // Step 1: ユーザーのTwitter認証情報を取得
    const connection = await getUserSNSConnection(userId, 'twitter');

    if (!connection) {
      return res.status(400).json({
        error: 'Twitterアカウントが連携されていません'
      });
    }

    // Step 2: 復号化してTwitterクライアント作成
    const userTwitter = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
      accessToken: decrypt(connection.accessToken),
      accessSecret: decrypt(connection.accessSecret),
    });

    // Step 3: ツイート投稿
    const tweet = await userTwitter.v2.tweet(content);

    return res.json({
      success: true,
      tweetId: tweet.data.id,
      tweetUrl: `https://twitter.com/${connection.screenName}/status/${tweet.data.id}`
    });

  } catch (error) {
    console.error('Twitter post error:', error);
    return res.status(500).json({
      error: 'ツイート投稿に失敗しました',
      details: error.message
    });
  }
}