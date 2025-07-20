// src/utils/openai.js - OpenAI API連携（既存Pythonコードから移植）
import OpenAI from 'openai';

// AI投稿文生成（既存のcontent_generator.pyから移植）
export const generateAIPost = async (prompt, apiKey) => {
  try {
    const openai = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true // PWA環境での実行許可
    });

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'あなたは日本語SNS投稿の専門家です。魅力的で読者の心に響く投稿文を作成してください。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 300,
      temperature: 0.8, // 創造性を高める
      top_p: 0.9,
      frequency_penalty: 0.3, // 繰り返しを避ける
      presence_penalty: 0.3
    });

    const content = response.choices[0].message.content.trim();

    // 投稿文の品質チェック
    if (content.length > 280) {
      // 280文字超過の場合は自動で調整
      return content.substring(0, 277) + '...';
    }

    return content;

  } catch (error) {
    console.error('OpenAI API Error:', error);

    if (error.code === 'invalid_api_key') {
      throw new Error('APIキーが無効です。設定を確認してください。');
    } else if (error.code === 'insufficient_quota') {
      throw new Error('APIの使用量制限に達しています。');
    } else if (error.code === 'rate_limit_exceeded') {
      throw new Error('APIの呼び出し回数制限に達しています。少し待ってから再試行してください。');
    } else {
      throw new Error('投稿生成に失敗しました: ' + (error.message || '不明なエラー'));
    }
  }
};

// 投稿プロンプトのテンプレート（既存のPromptから移植）
export const createPromptTemplate = (audience, style, topic) => {
  const templates = {
    '親しみやすい': {
      tone: 'カジュアルで親しみやすく、友達に話しかけるような口調',
      style: 'です/ます調で丁寧ながらも距離感を感じさせない'
    },
    '専門的': {
      tone: 'プロフェッショナルで信頼性のある、専門知識を感じさせる',
      style: 'である調で断定的、データや事実を重視'
    },
    '面白い': {
      tone: 'ユーモアがあり楽しい、エンタメ性を重視',
      style: '軽やかで明るい、適度なギャグや例えを含む'
    },
    '真面目': {
      tone: 'フォーマルで丁寧、信頼性と誠実さを重視',
      style: 'です/ます調で礼儀正しく、落ち着いた表現'
    },
    '励まし系': {
      tone: 'ポジティブでモチベーションを高める、応援する',
      style: '前向きで力強い、読者を勇気づける表現'
    },
    '質問系': {
      tone: '対話を重視し、読者との交流を促進',
      style: '疑問文を効果的に使い、エンゲージメントを誘発'
    }
  };

  const styleConfig = templates[style] || templates['親しみやすい'];

  return `
あなたは${audience}向けのSNS投稿を作成するプロフェッショナルです。

【対象読者】${audience}
【投稿テーマ】${topic}
【投稿スタイル】${styleConfig.tone}
【文体】${styleConfig.style}

以下の条件を満たすTwitter投稿文を作成してください：

■ 技術的要件
- 280文字以内（厳守）
- 日本語で自然な表現
- 適切な改行で読みやすく

■ 内容要件
- ${audience}の関心事や悩みに寄り添う
- ${topic}について具体的で実用的な内容
- 共感を呼ぶ体験談や事例を含む
- 読者にとって価値ある情報を提供

■ エンゲージメント要件
- ハッシュタグ2-3個を自然に組み込む
- いいねやリツイートしたくなる魅力
- コメントを誘発する要素（質問など）

■ ブランディング要件
- ${styleConfig.tone}な雰囲気を演出
- 専門性と親しみやすさのバランス
- フォローしたくなる人柄を表現

投稿文のみを出力してください（説明不要）：
  `;
};

// 投稿文の品質スコア算出
export const calculatePostQuality = (content) => {
  let score = 0;
  const checks = [];

  // 文字数チェック
  if (content.length >= 50 && content.length <= 280) {
    score += 20;
    checks.push('✅ 適切な文字数');
  } else {
    checks.push('❌ 文字数が不適切');
  }

  // ハッシュタグチェック
  const hashtagCount = (content.match(/#\w+/g) || []).length;
  if (hashtagCount >= 1 && hashtagCount <= 3) {
    score += 20;
    checks.push('✅ ハッシュタグ適切');
  } else {
    checks.push('❌ ハッシュタグ数調整が必要');
  }

  // 疑問文チェック（エンゲージメント）
  if (content.includes('？') || content.includes('?')) {
    score += 15;
    checks.push('✅ エンゲージメント要素あり');
  }

  // 改行チェック（読みやすさ）
  if (content.includes('\n')) {
    score += 15;
    checks.push('✅ 読みやすい構成');
  }

  // 感情表現チェック
  const emotionWords = ['！', '✨', '🎉', '💡', '❤️', '😊', '🚀'];
  if (emotionWords.some(word => content.includes(word))) {
    score += 15;
    checks.push('✅ 感情表現豊か');
  }

  // 行動喚起チェック
  const ctaWords = ['してみ', 'チェック', 'フォロー', 'シェア', 'コメント', 'DM'];
  if (ctaWords.some(word => content.includes(word))) {
    score += 15;
    checks.push('✅ 行動喚起あり');
  }

  return {
    score: Math.min(score, 100),
    checks: checks,
    grade: score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D'
  };
};