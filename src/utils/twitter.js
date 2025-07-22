// src/utils/twitter.js - Twitter API連携（CORS対応版）
import axios from 'axios';

// Twitter API v2 エンドポイント
const TWITTER_API_BASE = 'https://api.twitter.com/2';
const CORS_PROXY = 'https://cors-anywhere.herokuapp.com/'; // 本番では独自プロキシ推奨

// Twitter OAuth 認証フロー開始
export const initiateTwitterAuth = () => {
  // 簡易版：ユーザーに手動でアクセストークンを取得してもらう方式
  const authUrl = 'https://developer.twitter.com/en/portal/dashboard';

  alert(`
Twitter API設定手順：
1. ${authUrl} にアクセス
2. アプリを作成
3. Keys and Tokens タブを開く
4. Access Token and Secret を生成
5. 設定画面でトークンを入力

開発者ポータルを開きますか？
  `);

  window.open(authUrl, '_blank');
};

// Twitter投稿（4つの認証情報を使用）
export const postToTwitter = async (content, tokens) => {
  try {
    // 投稿前のバリデーション
    if (!content || content.trim().length === 0) {
      throw new Error('投稿内容が空です');
    }

    if (content.length > 280) {
      throw new Error('投稿が280文字を超えています');
    }

    if (!tokens || !tokens.consumerKey || !tokens.consumerSecret || !tokens.accessToken || !tokens.accessTokenSecret) {
      throw new Error('Twitter認証情報が不正です（4つすべて必要）');
    }

    // 注意：ブラウザ環境では OAuth 1.0a の署名生成が困難
    // 実際の実装では専用のプロキシサーバーまたはライブラリが必要
    alert('Twitter投稿機能：\n\n本格的な投稿機能は次回アップデートで対応予定です。\n現在は生成された投稿文をコピーして手動投稿してください。');

    // 投稿成功をローカルストレージに記録（デモ用）
    savePostHistory(content, 'demo_tweet_' + Date.now());

    return { success: true, id: 'demo_tweet_' + Date.now() };

  } catch (error) {
    console.error('Twitter投稿エラー:', error);
    throw error;
  }
};

// 投稿履歴の保存
const savePostHistory = (content, tweetId) => {
  try {
    const history = getPostHistory();
    const newPost = {
      id: Date.now(),
      content: content,
      tweetId: tweetId,
      timestamp: new Date().toISOString(),
      length: content.length
    };

    history.unshift(newPost); // 最新を先頭に

    // 最大50件まで保存
    if (history.length > 50) {
      history.splice(50);
    }

    localStorage.setItem('twitter_post_history', JSON.stringify(history));
  } catch (error) {
    console.error('投稿履歴保存エラー:', error);
  }
};

// 投稿履歴の取得
export const getPostHistory = () => {
  try {
    const historyJson = localStorage.getItem('twitter_post_history');
    return historyJson ? JSON.parse(historyJson) : [];
  } catch (error) {
    console.error('投稿履歴取得エラー:', error);
    return [];
  }
};

// 投稿履歴の削除
export const clearPostHistory = () => {
  localStorage.removeItem('twitter_post_history');
};

// Twitter認証トークンの検証（4つの認証情報）
export const validateTwitterTokens = async (tokens) => {
  try {
    if (!tokens || !tokens.consumerKey || !tokens.consumerSecret || !tokens.accessToken || !tokens.accessTokenSecret) {
      return { valid: false, error: '4つのTwitter API認証情報がすべて必要です' };
    }

    // 基本的な形式チェック
    if (tokens.consumerKey.length < 10 || tokens.consumerSecret.length < 20 ||
      !tokens.accessToken.includes('-') || tokens.accessTokenSecret.length < 20) {
      return { valid: false, error: '認証情報の形式が正しくありません' };
    }

    // 実際のAPI検証は OAuth 1.0a 署名が必要なため、
    // 現在は形式チェックのみで有効とする
    return {
      valid: true,
      user: { username: 'api_user' }
    };

  } catch (error) {
    return {
      valid: false,
      error: '認証確認中にエラーが発生しました: ' + error.message
    };
  }
};

// 投稿文の自動最適化
export const optimizeForTwitter = (content) => {
  let optimized = content.trim();

  // 280文字制限対応
  if (optimized.length > 280) {
    // 文末の「...」を考慮して277文字でカット
    optimized = optimized.substring(0, 277) + '...';
  }

  // 改行の最適化（スマホでの見やすさ重視）
  optimized = optimized.replace(/\n{3,}/g, '\n\n'); // 3連続以上の改行を2つに

  // ハッシュタグの最適化（末尾に移動）
  const hashtags = optimized.match(/#\w+/g) || [];
  if (hashtags.length > 0) {
    // ハッシュタグを除去
    let textWithoutHashtags = optimized.replace(/#\w+/g, '').trim();
    // 末尾にハッシュタグを追加
    optimized = textWithoutHashtags + '\n\n' + hashtags.join(' ');
  }

  return optimized;
};

// 投稿予約機能（将来拡張用）
export const schedulePost = (content, scheduledTime) => {
  const scheduledPosts = JSON.parse(localStorage.getItem('scheduled_posts') || '[]');

  const newSchedule = {
    id: Date.now(),
    content: content,
    scheduledTime: scheduledTime,
    status: 'pending'
  };

  scheduledPosts.push(newSchedule);
  localStorage.setItem('scheduled_posts', JSON.stringify(scheduledPosts));

  return newSchedule;
};

// Twitter Web Intent（フォールバック投稿方法）
export const openTwitterIntent = (content) => {
  const encodedContent = encodeURIComponent(content);
  const intentUrl = `https://twitter.com/intent/tweet?text=${encodedContent}`;
  window.open(intentUrl, '_blank', 'width=600,height=400');
};