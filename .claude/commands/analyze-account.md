---
description: "/analyze-account - TikTokアカウント分析（モデリング用）"
---

# /analyze-account - アカウント分析スキル

TikTokアカウントを分析し、成功パターンをモデリングするためのレポートを生成。

## 使用方法

```
/analyze-account https://www.tiktok.com/@username
/analyze-account @username
```

## 実行手順

### 1. 引数の取得

ユーザーが指定したURLまたは@usernameを取得する。
引数がない場合は、ユーザーに入力を求める。

### 2. 環境変数確認

```bash
grep -E "RAPIDAPI|GEMINI" .env.local | head -3
```

設定されていない場合は以下を案内:
- `TIKTOK_RAPIDAPI_KEY` または `RAPIDAPI_KEY`: RapidAPIで取得
- `GEMINI_API_KEY`: Google AI Studioで取得

### 3. 分析スクリプト実行

```bash
npx dotenv -e .env.local -- npx tsx scripts/analyze-account.ts <URL or @username>
```

### 4. レポート確認

スクリプトが出力するレポートを確認し、ユーザーに提示する。

レポートは以下に保存される:
```
docs/account-analysis/reports/<username>_<date>.md
```

## 出力内容

### アカウント概要
- フォロワー数
- 総いいね数
- エンゲージメント率（LVR/CVR/SVR/保存率）
- 業界平均との比較

### Top3動画分析
- 再生数・LVR
- AI分析（フック、構成、音楽、CTA）
- バズ要因スコア

### 成功パターン
- 共通点の抽出
- モデリングポイント
- 自社適用案

## 処理時間

- プロフィール取得: ~10秒
- 動画ダウンロード: ~20秒
- AI分析（3件）: ~45秒
- **合計: 約90秒**

## エラー対応

| エラー | 対応 |
|--------|------|
| RAPIDAPI_KEY未設定 | .env.localに追加を案内 |
| GEMINI_API_KEY未設定 | .env.localに追加を案内 |
| ユーザーが見つからない | URLを確認するよう案内 |
| API制限 | 時間をおいて再実行 |

## 注意事項

- RapidAPI無料枠は月500リクエスト程度
- AI分析はGemini 2.0 Flash（無料枠あり）
- レポートは `docs/account-analysis/reports/` に自動保存
