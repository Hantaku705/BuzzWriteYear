---
description: "/generate-like - 学習済みスタイルで動画生成"
---

# /generate-like - スタイル適用動画生成スキル

保存済みスタイルテンプレートを使用して、同じ雰囲気の動画を生成。

## 使用方法

```
/generate-like <style_id> --image <image_url>
/generate-like <style_id> --image <image_url> --text "表示テキスト"
```

## 実行手順

### 1. 引数の取得

ユーザーが指定したスタイルIDと画像URLを取得する。
引数がない場合は、ユーザーに入力を求める。

### 2. 環境変数確認

```bash
grep "KLING_API_KEY" .env.local | head -1
```

設定されていない場合は `KLING_API_KEY` を案内する。

### 3. スタイルテンプレート確認

```bash
ls docs/account-analysis/styles/
```

利用可能なスタイル一覧を表示。

### 4. 生成スクリプト実行

```bash
npx dotenv -e .env.local -- npx tsx scripts/generate-like.ts <style_id> --image <image_url> [--text "テキスト"]
```

### 5. 結果確認

生成された動画ファイルのパスを確認し、ユーザーに提示する。

出力先:
```
output/generated/<style_id>_<timestamp>.mp4
output/generated/<style_id>_<timestamp>_metadata.json
```

## オプション

| オプション | 説明 | 必須 |
|-----------|------|------|
| `--image <url>` | 商品画像のURL | 必須 |
| `--text <text>` | 動画に表示するテキスト | 任意 |
| `--output <dir>` | 出力ディレクトリ | 任意 |
| `--skip-ugc` | UGC加工をスキップ | 任意 |

## 処理フロー

```
┌──────────────────────────────────────────────────────────────────┐
│ 1. スタイルテンプレート読み込み                                   │
│    docs/account-analysis/styles/<style_id>.json                  │
│                                                                  │
│ 2. Kling AI 動画生成                                             │
│    - テンプレートのプロンプト使用                                │
│    - 商品画像を入力                                              │
│    - 約1-3分で完了                                               │
│                                                                  │
│ 3. FFmpeg UGC加工                                                │
│    - テンプレートのエフェクト適用                                │
│    - camera_shake, phone_quality, film_grain 等                  │
│                                                                  │
│ 4. テキストオーバーレイ（オプション）                            │
│    - 商品名や訴求テキストを追加                                  │
│                                                                  │
│ 5. 最終出力                                                      │
│    - output/generated/<style_id>_<timestamp>.mp4                 │
└──────────────────────────────────────────────────────────────────┘
```

## 処理時間

- スタイル読み込み: 即時
- Kling AI動画生成: 約1-3分
- UGC加工: 約10-30秒
- テキスト追加: 約5-10秒
- **合計: 約2-4分**

## 使用例

```bash
# 1. 利用可能なスタイル確認
ls docs/account-analysis/styles/

# 2. スタイル適用で動画生成
/generate-like luana_beauty_2nd --image https://example.com/product.jpg

# 3. テキスト付きで生成
/generate-like luana_beauty_2nd --image https://example.com/product.jpg --text "新商品を紹介！"

# 4. UGC加工なしで生成
/generate-like luana_beauty_2nd --image https://example.com/product.jpg --skip-ugc
```

## 出力ファイル

### 動画ファイル
```
output/generated/luana_beauty_2nd_2026-01-13T12-00-00-000Z.mp4
```

### メタデータJSON
```json
{
  "styleId": "luana_beauty_2nd",
  "styleTemplate": "luana.beauty.2nd スタイル",
  "imageUrl": "https://example.com/product.jpg",
  "text": "新商品を紹介！",
  "prompt": "Product demonstration video, handheld camera...",
  "effects": {
    "effects": ["camera_shake", "phone_quality"],
    "intensity": "light"
  },
  "generatedAt": "2026-01-13T12:00:00.000Z",
  "outputPath": "output/generated/..."
}
```

## エラー対応

| エラー | 対応 |
|--------|------|
| KLING_API_KEY未設定 | .env.localに追加を案内 |
| スタイルが見つからない | `/learn-style` で先にスタイル学習 |
| 画像URLアクセス不可 | 公開URLを使用するよう案内 |
| Kling APIエラー | API残高・制限を確認 |

## 前提条件

1. **スタイル学習済み**: `/learn-style` で対象スタイルを学習済みであること
2. **画像URL**: 公開アクセス可能なURL（Kling AIがフェッチするため）
3. **API残高**: Kling AI APIの残高があること

## 関連スキル

| スキル | 説明 |
|--------|------|
| `/learn-style` | アカウントからスタイル学習 |
| `/analyze-account` | アカウント分析レポート生成 |
