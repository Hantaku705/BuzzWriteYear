---
description: "/learn-style - UGCスタイル学習（アカウント分析→JSONテンプレート）"
---

# /learn-style - UGCスタイル学習スキル

TikTokアカウントを分析し、投稿スタイルをJSONテンプレートとして保存。
後で `/generate-like` で同じスタイルの動画を生成できる。

## 使用方法

```
/learn-style https://www.tiktok.com/@username
/learn-style @username
```

## 実行手順

### 1. 引数の取得

ユーザーが指定したURLまたは@usernameを取得する。

### 2. 環境変数確認

```bash
grep -E "RAPIDAPI|GEMINI" .env.local | head -3
```

### 3. スタイル学習スクリプト実行

```bash
npx dotenv -e .env.local -- npx tsx scripts/learn-style.ts <URL or @username>
```

### 4. 結果確認

スクリプトが出力するスタイルテンプレートを確認し、ユーザーに提示する。

テンプレートは以下に保存される:
```
docs/account-analysis/styles/<username>.json
```

## 出力内容

### スタイルプロファイル
- **カメラワーク**: handheld/tripod/gimbal、手ブレ強度
- **編集スタイル**: テンポ、平均クリップ長、ジャンプカット
- **視覚スタイル**: 色調、フィルター、彩度
- **音声スタイル**: BGM、ナレーション

### 生成パラメータ
- **Klingプロンプト**: AI動画生成用プロンプト
- **FFmpegエフェクト**: UGC加工設定

## 処理時間

- プロフィール取得: ~10秒
- 動画ダウンロード: ~30秒
- AI分析（5件）: ~60秒
- **合計: 約100秒**

## 使用例

```bash
# 1. スタイル学習
/learn-style @luana.beauty.2nd

# 出力例:
# スタイルID: luana_beauty_2nd
# 保存先: docs/account-analysis/styles/luana_beauty_2nd.json
#
# 【スタイル概要】
#   全体の雰囲気: カジュアルな商品紹介
#   キーワード: beauty, product, tutorial
#
# 使用方法:
#   /generate-like luana_beauty_2nd --image product.jpg
```

## 注意事項

- RapidAPI無料枠は月500リクエスト程度
- Gemini 2.0 Flash（無料枠あり）
- 学習済みスタイルは `docs/account-analysis/styles/` に保存
