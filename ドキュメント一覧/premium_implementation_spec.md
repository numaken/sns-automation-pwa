# 💎 プレミアム機能実装仕様書 - 次フェーズ引き継ぎ書

## 📌 重要: この仕様書の内容のみを実装してください。新提案は禁止です。

## 🎯 前提条件（確認必須）

### ✅ 無料版実装完了確認
以下が100%動作していることを確認してから実装開始：

```bash
# 1. 無料版動作確認
curl -X POST -H "Content-Type: application/json" \
  -d '{"prompt":"テスト","tone":"カジュアル","userType":"free"}' \
  https://sns-automation-pwa.vercel.app/api/generate-post-shared

# 期待結果: 「remaining: 2」等の正常応答

# 2. 制限動作確認  
# 3回生成後、4回目で制限エラーになることを確認

# 3. 管理者API確認
curl -H "x-admin-key: sns-automation-admin-2024" \
  https://sns-automation-pwa.vercel.app/api/admin/cost-monitor
```

## 🚨 実装対象（変更禁止）

### Phase 1: プレミアム無制限生成機能（最優先）

#### 1.1 PostGenerator.jsx修正
**目的**: プレミアムユーザーの制限チェックをスキップ

```javascript
// 既存のhandleGenerateClick関数を修正
const handleGenerateClick = () => {
  if (userPlan === 'premium') {
    // プレミアムプランは無制限（既存のgeneratePost使用）
    generatePost();
  } else {
    // 無料プランは共有APIキー使用（既存実装維持）
    generatePostWithSharedAPI();
  }
};
```

#### 1.2 プレミアム表示修正
**目的**: 正確なプラン表示

```javascript
// プラン表示の修正
const planDisplay = userPlan === 'premium' ? 'プレミアムプラン - 無制限' : '無料プラン';
const usageDisplay = userPlan === 'premium' ? null : `残り ${usage.remaining}/3回`;
```

### Phase 2: ユーザープラン管理機能

#### 2.1 プラン状態管理
**ファイル**: `src/hooks/useUserPlan.js`（新規作成）

```javascript
import { useState, useEffect } from 'react';

export const useUserPlan = () => {
  const [userPlan, setUserPlan] = useState('free');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkUserSubscription();
  }, []);

  const checkUserSubscription = async () => {
    try {
      // 既存のStripe連携を使用
      const response = await fetch('/api/check-subscription', {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });
      
      const data = await response.json();
      setUserPlan(data.plan || 'free');
    } catch (error) {
      console.error('Subscription check error:', error);
      setUserPlan('free'); // デフォルトは無料
    } finally {
      setIsLoading(false);
    }
  };

  return { userPlan, isLoading, checkUserSubscription };
};
```

#### 2.2 PostGenerator.jsx統合
```javascript
// useUserPlanフックの使用
import { useUserPlan } from '../hooks/useUserPlan';

const PostGenerator = () => {
  const { userPlan, isLoading } = useUserPlan();
  
  // 既存コードは維持
  // userPlan変数を上記フックから取得に変更
};
```

### Phase 3: 直接SNS投稿機能（プレミアム限定）

#### 3.1 Twitter投稿API修正
**ファイル**: `api/post-to-twitter.js`（既存修正）

```javascript
// プレミアムユーザーのみ許可する制限追加
export default async function handler(req, res) {
  // 既存の認証チェック後に追加
  
  // プレミアムプランチェック
  const userPlan = await getUserPlan(userId); // 実装必要
  if (userPlan !== 'premium') {
    return res.status(403).json({
      error: 'プレミアムプラン限定機能です',
      upgrade_required: true
    });
  }

  // 既存の投稿処理は維持
};
```

#### 3.2 Threads投稿API修正
**ファイル**: `api/post-to-threads.js`（既存修正）

```javascript
// Twitter投稿APIと同様のプレミアム制限を追加
```

### Phase 4: プレミアムUI改善

#### 4.1 広告削除
**条件**: userPlan === 'premium'の場合、広告コンポーネントを非表示

#### 4.2 プレミアム専用デザイン
**追加**: プレミアム限定の視覚的差別化

## 🔧 技術仕様（厳密遵守）

### 環境変数（追加なし）
既存の環境変数のみ使用。新しい環境変数は追加しない。

### データベース設計
既存のVercel KVに以下のキー追加：
```
user_plan:${userId} = "premium" | "free"
```

### API設計原則
- 既存APIの拡張のみ
- 新しいエンドポイントは最小限
- 既存の認証システム活用

## 📋 実装順序（厳密遵守）

### Week 1: 基本プレミアム機能
- [ ] useUserPlanフック実装
- [ ] PostGenerator.jsx修正（無制限生成）
- [ ] プラン表示修正
- [ ] 基本テスト

### Week 2: SNS投稿制限
- [ ] Twitter投稿API修正
- [ ] Threads投稿API修正
- [ ] プレミアム制限テスト
- [ ] 統合テスト

### Week 3: UI改善
- [ ] 広告削除機能
- [ ] プレミアムデザイン
- [ ] ユーザビリティテスト
- [ ] バグ修正

### Week 4: 最終調整
- [ ] パフォーマンス最適化
- [ ] セキュリティチェック
- [ ] 本番リリース準備
- [ ] ドキュメント更新

## 🚨 実装時の厳守ルール

### 禁止事項（絶対遵守）
- ❌ 新しい戦略の提案
- ❌ 既存仕様の変更提案  
- ❌ 追加機能の提案
- ❌ 設計思想の変更

### 許可された作業のみ
- ✅ 上記仕様の実装のみ
- ✅ 技術的質問への回答
- ✅ バグ修正（仕様範囲内）
- ✅ テスト実行

### 判断基準
**迷った場合は実装しない。仕様書に明記された内容のみ実装。**

## 📊 成功判定基準

### ✅ 技術的成功
- プレミアムユーザーが無制限生成可能
- 直接SNS投稿がプレミアム限定で動作
- 既存の無料版機能が影響なく動作

### ✅ ビジネス的成功
- プレミアム価値の明確な差別化
- アップグレード促進効果
- ユーザー満足度向上

## 🎯 次のClaude（引き継ぎ者）への指示

### 📋 引き継ぎ事項
1. この仕様書の内容のみを実装してください
2. 新しい提案・変更は一切行わないでください
3. 技術的な質問のみ回答してください
4. 実装完了まで他の話題に移らないでください

### 🚨 禁止事項
- 新しい戦略の提案
- 既存仕様の変更提案
- 他のアプローチの検討
- 実装以外の議論

### ⚠️ 最重要メッセージ
**「無料版は完璧に動作中。この仕様書の内容のみを段階的に実装せよ。新提案は一切不要。」**

## 📁 実装ファイル一覧

### 新規作成
- `src/hooks/useUserPlan.js` - プラン管理フック

### 修正対象
- `src/components/PostGenerator.jsx` - プレミアム無制限対応
- `api/post-to-twitter.js` - プレミアム制限追加
- `api/post-to-threads.js` - プレミアム制限追加

### 維持するファイル
- `api/generate-post-shared.js` - 無料版（変更禁止）
- 全ての管理者API - 監視機能（変更禁止）

---

**📅 作成日**: 2025年8月3日  
**🎯 対象**: プレミアム機能実装フェーズ  
**⚠️ 重要**: 無料版の動作を一切破壊しないこと