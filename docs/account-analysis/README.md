# TikTokアカウント分析システム

SNSアカウントのプロフィールURLから、動画コンテンツを自動取得・AI分析し、クライアント提出レベルのレポートを生成するシステム。

## 目次

- [概要](#概要)
- [処理フロー](#処理フロー)
- [必要な環境](#必要な環境)
- [ファイル構成](#ファイル構成)
- [関連ドキュメント](#関連ドキュメント)

---

## 概要

### 何ができるか

```
入力: https://www.tiktok.com/@username
      ↓
出力: - 定量分析レポート（エンゲージメント率、業界比較）
      - 動画別AI分析（構成、フック、改善点）
      - 改善提案（優先度別）
```

### 主な機能

| 機能             | 説明                                            |
| ---------------- | ----------------------------------------------- |
| プロフィール取得 | ユーザー情報・直近10動画を自動取得              |
| 統計計算         | LVR/CVR/SVR/保存率を算出、業界平均と比較        |
| AI動画分析       | 各動画をGeminiで構成・フック・バズ要因を分析    |
| レポート生成     | Top3/Worst1ランキング、改善提案をMarkdownで出力 |

### 処理時間の目安

| ステップ         | 時間      |
| ---------------- | --------- |
| プロフィール取得 | ~10秒     |
| 統計計算         | ~1秒      |
| 動画分析（10件） | ~40秒     |
| レポート生成     | ~30秒     |
| **合計**         | **~90秒** |

---

## 処理フロー

```
┌─────────────────────────────────────────────────────────────┐
│ 1. URL入力                                                   │
│    @username または https://tiktok.com/@username            │
└─────────────────────┬───────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. プロフィール情報取得                                      │
│    RapidAPI → secUid → 直近10動画                           │
└─────────────────────┬───────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. 統計計算                                                  │
│    再生数・いいね・コメント・シェア・保存 → 各種率を算出    │
└─────────────────────┬───────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. 動画分析 【5件ずつ並列】                                  │
│    ダウンロード → Gemini FileManager → AI分析              │
└─────────────────────┬───────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. レポート生成                                              │
│    定量 + 定性 + ランキング + 改善提案                      │
└─────────────────────┬───────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. ストリーミング出力                                        │
│    SSE形式でリアルタイム表示                                 │
└─────────────────────────────────────────────────────────────┘
```

詳細なフロー図 → [architecture.md](./architecture.md)

---

## 必要な環境

### 環境変数

```bash
# 必須
GEMINI_API_KEY=xxx          # Google AI Studio で取得
TIKTOK_RAPIDAPI_KEY=xxx     # RapidAPI で取得

# オプション
INSTAGRAM_RAPIDAPI_KEY=xxx  # Instagram分析用
```

### 使用API

| API                                                                                   | 用途                       | 料金目安           |
| ------------------------------------------------------------------------------------- | -------------------------- | ------------------ |
| [tiktok-api23](https://rapidapi.com/yukivideo/api/tiktok-api23)                       | プロフィール・動画一覧取得 | ~$0.001/リクエスト |
| [tiktok-video-downloader](https://rapidapi.com/yi005/api/tiktok-video-downloader-api) | 動画ダウンロード           | ~$0.001/リクエスト |
| [Google Generative AI](https://ai.google.dev/)                                        | 動画分析・レポート生成     | Free tier あり     |

### 技術スタック

- **Runtime**: Node.js 18+
- **Framework**: Next.js 14+ (App Router)
- **AI**: Google Generative AI SDK (@google/generative-ai)
- **Streaming**: Server-Sent Events (SSE)

---

## ファイル構成

```
docs/account-analysis/
├── README.md           # このファイル（概要）
├── architecture.md     # 詳細フロー図・設計思想
├── api-reference.md    # API仕様・型定義
└── code-examples.md    # 実装例・コードスニペット
```

### 実装ファイル（参考）

```
web/
├── app/api/chat/route.ts              # メインAPI
├── lib/tiktok/
│   ├── getTikTokUserVideos.ts         # プロフィール取得
│   ├── downloadTikTokVideo.ts         # 動画ダウンロード
│   ├── analyzeVideoWithGemini.ts      # AI分析
│   └── calculateAccountStats.ts       # 統計計算
└── lib/report/
    ├── generateQuantitativeReport.ts  # 定量レポート
    └── generateVideoRanking.ts        # ランキング生成
```

---

## 関連ドキュメント

- [architecture.md](./architecture.md) - 詳細なアーキテクチャ図
- [api-reference.md](./api-reference.md) - API仕様と型定義
- [code-examples.md](./code-examples.md) - 実装コード例

---

## クイックスタート

### 1. 環境変数設定

```bash
cp .env.example .env.local
# GEMINI_API_KEY と TIKTOK_RAPIDAPI_KEY を設定
```

### 2. 開発サーバー起動

```bash
cd web
npm install
npm run dev
```

### 3. 分析実行

チャット画面で以下を入力:

```
https://www.tiktok.com/@username
```

自動的にアカウント分析が開始されます。
