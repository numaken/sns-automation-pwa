# 📋 SNS自動化ツール - 統合引き継ぎ指示書

**作成日**: 2025年8月6日  
**プロジェクト名**: SNS自動化ツール（AI SNS Automation PWA）  
**リポジトリ**: https://github.com/numaken/sns-automation-pwa.git  
**本番URL**: https://sns-automation-pwa.vercel.app/  
**現在のステータス**: 部分稼働中（要修正箇所あり）

---

## 🚨 最優先対応事項（Critical Issues）

### 1. **制限カウントの異常** 🔴
**問題**: 1日3回制限のはずが、1回の使用で制限到達
```bash
# 現象確認済み
1回目: remaining: 0 になる（本来は remaining: 2 であるべき）
2回目: 既に制限エラー
```

**修正方法**:
```javascript
// api/generate-post-shared.js の修正
// 現在の問題のあるコード
const DAILY_LIMIT = 3;
const usage = await getKVValue(key) || 0;
await incrementKVValue(key); // この増分処理に問題がある可能性

// 修正案
const usage = parseInt(await getKVValue(key) || '0');
const newUsage = usage + 1;
await setKVValue(key, newUsage.toString(), 86400);
return { remaining: Math.max(0, DAILY_LIMIT - newUsage) };
```

### 2. **SNS投稿APIエラー** 🔴
**Twitter API**: FUNCTION_INVOCATION_FAILED
```javascript
// api/post-to-twitter.js のデバッグ必要
// エラーログを確認
vercel logs --follow
```

**Threads API**: パラメータ名の不一致
```javascript
// api/post-to-threads.js の修正
// 現在: req.body.content
// 修正: req.body.text または req.body.content の両方を受け入れる
const text = req.body.text || req.body.content;
if (!text) {
  return res.status(400).json({ error: '投稿テキストが必要です', code: 'MISSING_TEXT' });
}
```

### 3. **UI表示の不整合** 🟡
**問題**: プレミアムメンバーなのに「無料プラン」表示
```javascript
// src/components/PostGenerator.jsx の確認
// userPlan の状態管理を確認
const { userPlan } = useUserPlan(); // これが正しく動作していない可能性
```

### 4. **Stripe API未実装** 🟡
**問題**: `/api/create-subscription` エンドポイントが存在しない
```bash
# ファイルの存在確認
ls api/create-subscription.js
# 存在しない場合は実装が必要
```

---

## ✅ 正常動作している機能

### 動作確認済み機能一覧
| 機能 | 状態 | 確認コマンド/URL |
|------|------|-----------------|
| AI投稿生成（共有API） | ✅ 動作（要修正） | `curl -X POST .../api/generate-post-shared` |
| AI投稿生成（プレミアム） | ✅ 正常動作 | `curl -X POST .../api/generate-post` |
| コスト監視 | ✅ 正常動作 | `curl -H "x-admin-key: ..." .../api/admin/cost-monitor` |
| 緊急停止 | ✅ 正常動作 | `curl -H "x-admin-key: ..." .../api/admin/emergency-stop` |
| 環境変数 | ✅ 完全設定 | `vercel env ls` |

---

## 🔧 即座に実行すべき修正手順

### Step 1: 制限カウント修正（最優先）
```bash
# 1. ローカルで修正
cd sns-automation-pwa
nano api/generate-post-shared.js

# 2. incrementDailyUsage 関数を確認・修正
# 3. デプロイ
git add api/generate-post-shared.js
git commit -m "fix: 制限カウントの正確な処理を修正"
git push origin main
vercel --prod

# 4. 動作確認
# IPをリセットして新しいテスト
curl -X POST https://sns-automation-pwa.vercel.app/api/admin/reset-limits \
-H "x-admin-key: sns-automation-admin-2024"
```

### Step 2: SNS投稿API修正
```bash
# Twitter API のデバッグ
vercel logs https://sns-automation-pwa.vercel.app --follow

# Threads API パラメータ修正
nano api/post-to-threads.js
# text/content 両方を受け入れるように修正

# デプロイ
git add api/post-to-threads.js api/post-to-twitter.js
git commit -m "fix: SNS投稿APIのエラー修正"
git push origin main
```

### Step 3: UI表示修正
```javascript
// src/components/PostGenerator.jsx 修正
// ヘッダー部分の表示ロジック確認
const displayPlan = userPlan === 'premium' ? 'プレミアムプラン' : '無料プラン';
```

### Step 4: Stripe API実装確認
```bash
# ファイル存在確認
ls -la api/ | grep subscription

# 存在しない場合、ドキュメントから実装をコピー
# premium_implementation_spec.md を参照
```

---

## 📊 システム構成と環境変数

### 確認済み環境変数（すべて設定済み）
```
✅ OPENAI_API_KEY_SHARED - 共有APIキー
✅ KV_REST_API_URL / KV_REST_API_TOKEN - Redis接続
✅ ADMIN_KEY - 管理者認証
✅ DAILY_COST_LIMIT - コスト上限（$10）
✅ TWITTER_* - Twitter API認証情報
✅ THREADS_* - Threads API認証情報
✅ STRIPE_* - Stripe決済情報
```

### システムアーキテクチャ
```
Frontend (React PWA)
├── PostGenerator.jsx ← UI表示修正必要
├── SnsPostButtons.jsx
└── UpgradePrompt.jsx

Backend (Vercel Functions)
├── generate-post-shared.js ← 制限カウント修正必要
├── generate-post.js ← 正常動作
├── post-to-twitter.js ← エラー修正必要
├── post-to-threads.js ← パラメータ修正必要
├── create-subscription.js ← 未実装？要確認
└── admin/* ← 正常動作

Database (Vercel KV)
└── 制限管理のロジック修正必要
```

---

## 🎯 修正後の動作確認チェックリスト

### 必須確認項目
- [ ] 制限カウント: 1回目でremaining:2、2回目で1、3回目で0
- [ ] Twitter投稿: 正常に投稿されURL返却
- [ ] Threads投稿: 正常に投稿されURL返却
- [ ] UI表示: プレミアム時に「プレミアムプラン」表示
- [ ] Stripe API: エンドポイント存在確認

### 動作確認コマンド集
```bash
# 制限リセット（テスト用）
curl -X POST https://sns-automation-pwa.vercel.app/api/admin/reset-limits \
-H "x-admin-key: sns-automation-admin-2024" \
-d '{"ip":"your-ip"}'

# 制限カウント確認（3回実行）
for i in {1..4}; do
  echo "=== Test $i ==="
  curl -X POST https://sns-automation-pwa.vercel.app/api/generate-post-shared \
  -H "Content-Type: application/json" \
  -d "{\"prompt\":\"テスト$i\",\"tone\":\"カジュアル\",\"userType\":\"free\"}"
  echo ""
  sleep 1
done

# SNS投稿テスト
curl -X POST https://sns-automation-pwa.vercel.app/api/post-to-twitter \
-H "Content-Type: application/json" \
-d '{"content":"修正後テスト投稿"}'

curl -X POST https://sns-automation-pwa.vercel.app/api/post-to-threads \
-H "Content-Type: application/json" \
-d '{"text":"修正後テスト投稿"}'
```

---

## 📈 プロジェクトの現状と今後

### 現在の達成度
- **Phase 1-3**: 90%完成（要修正）
- **革命的機能**: APIキー設定不要 ✅ 実装済み
- **収益化基盤**: Stripe統合未完成

### 優先順位
1. 🔴 **最優先**: 制限カウント修正（ユーザー体験に直結）
2. 🔴 **優先**: SNS投稿API修正（プレミアム機能の核心）
3. 🟡 **重要**: UI表示修正（ユーザー混乱防止）
4. 🟡 **重要**: Stripe統合完成（収益化）

### ビジネスインパクト
- **体験率**: 現在も高い（APIキー設定不要の効果）
- **転換率**: SNS投稿機能修正で向上見込み
- **収益化**: Stripe統合完成で即座に開始可能

---

## 🚀 次のアクションプラン

### 今すぐ（30分以内）
1. 制限カウントのコード確認・修正
2. Vercelログで詳細エラー確認
3. 修正のデプロイ

### 今日中
1. SNS投稿API完全修復
2. UI表示の整合性確保
3. 全機能の動作確認

### 今週中
1. Stripe統合完成
2. ユーザーテスト実施
3. マーケティング開始準備

---

## 📞 引き継ぎ完了条件

以下がすべて達成されたら、システムは商用運用可能：

- ✅ 制限カウント正常動作（1日3回）
- ✅ SNS投稿機能正常動作
- ✅ UI表示の整合性
- ✅ Stripe決済機能（オプション）

**現在の最重要タスク**: 制限カウントの修正とSNS投稿APIの修復

---

## 💡 トラブルシューティング用リソース

### デバッグコマンド
```bash
# Vercelログ監視
vercel logs --follow

# Redis内容確認（実装が必要）
curl https://sns-automation-pwa.vercel.app/api/admin/debug-redis \
-H "x-admin-key: sns-automation-admin-2024"

# 環境変数確認
vercel env pull .env.local
```

### 参考ドキュメント
- `standard_implementation_spec.md`: 共有APIキー戦略の詳細
- `premium_implementation_spec.md`: プレミアム機能仕様
- `complete_handover_phase2_finished-2025-08-05.md`: Phase 2完了時の状態

---

**作成者**: Claude (Anthropic)  
**最終確認**: 2025年8月6日 21:54 JST  
**緊急度**: 高（制限カウント・SNS投稿API修正必須）