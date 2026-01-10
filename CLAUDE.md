# BuzzWriteYear - プロジェクト設定

このプロジェクト固有の設定。共通設定（~/.claude/CLAUDE.md）を継承。

---

## ミッション

**ユーザーが18時間使い続けたくなるアプリを作る**

最高のUI/UXを通じて、動画生成・投稿・分析のワークフローを中毒的に楽しくする。
結果としてGMVが最大化される。

---

## 意思決定原則

迷った時は以下の優先順位で判断する：

1. **UX中毒性** - ユーザーがもっと使いたくなるか？
2. **操作の快感** - クリック・操作が気持ち良いか？
3. **フィードバック** - 結果が即座に分かるか？
4. **シンプルさ** - 迷わず直感的に使えるか？

### 判断例

| 迷い | 判断 |
|------|------|
| 機能追加 vs UX改善 | → UX改善（中毒性優先） |
| 詳細設定 vs ワンクリック | → ワンクリック（操作の快感） |
| 正確さ vs 速度 | → 速度（即座のフィードバック） |
| 高機能 vs シンプル | → シンプル（直感的操作） |

---

## プロジェクト概要

- 商品訴求動画を大量生成（Remotion + Kling AI + HeyGen + FFmpeg）
- UGC風コンテンツで自然な訴求
- 投稿→分析→最適化のPDCAサイクル

---

## 技術スタック

| Layer | 技術 |
|-------|------|
| Frontend | Next.js 14 + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| State | Zustand + TanStack Query |
| Database | PostgreSQL (Supabase) |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| Queue | BullMQ + Redis (Upstash) |
| Video Gen | Remotion + Kling AI + HeyGen + FFmpeg |
| Charts | Recharts |
| Deploy | Vercel + Docker |

---

## セットアップ

```bash
# 依存関係インストール
npm install

# 開発サーバー起動
npm run dev

# ビルド
npm run build

# Remotion Studio
npm run remotion:studio

# E2Eテスト実行
npx playwright test
```

### 環境変数

`.env.example` を `.env.local` にコピーして設定:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
HEYGEN_API_KEY=
KLING_API_KEY=
GEMINI_API_KEY=
REDIS_URL=
```

### Supabaseセットアップ

1. Supabaseプロジェクト作成
2. SQL Editorで `supabase/combined_migration.sql` 実行
3. `.env.local` に認証情報設定

### ワーカー起動（ローカル）

```bash
# 開発環境
npm run worker

# 本番環境相当
npm run worker:prod

# dotenv-cliを使う場合
npx dotenv -e .env.local -- npx tsx scripts/start-worker.ts
```

### ワーカー起動（Render - 本番）

**デプロイ済み**: kling-worker サービスがRenderで常時起動中

新規デプロイ/再設定時:
1. https://dashboard.render.com でGitHubログイン
2. **New** → **Blueprint** → リポジトリ選択
3. `render.yaml` が自動検出される
4. 環境変数設定（REDIS_URL, SUPABASE, KLING_API_KEY）
5. **Manual Deploy** で起動

---

## Key Files

| ファイル | 役割 |
|----------|------|
| `src/app/(dashboard)/` | ダッシュボードページ群 |
| `src/app/api/videos/generate/` | 動画生成APIエンドポイント |
| `src/app/api/tiktok/` | TikTok OAuth APIエンドポイント |
| `src/components/layout/` | Sidebar, Header |
| `src/components/product/` | 商品関連コンポーネント |
| `src/components/video/` | 動画プレビュー（RemotionPreview, VideoGenerateModal, VariantGenerateModal） |
| `src/components/analytics/` | 分析ダッシュボードコンポーネント |
| `src/components/auth/` | 認証フォームコンポーネント |
| `src/app/(auth)/` | 認証ページ（login, signup, callback） |
| `src/app/(dashboard)/videos/[id]/` | 動画詳細ページ |
| `src/hooks/` | カスタムフック（useAuth, useProducts, useVideos, useStats, useAnalytics, useUpload, useOptimizedUpload, useGenerateVideo, useVideoStatus） |
| `src/lib/api/` | API関数（products, videos, stats, analytics） |
| `src/lib/query/` | TanStack Query設定 |
| `src/lib/storage/` | Supabase Storage画像アップロード |
| `src/lib/supabase/` | Supabaseクライアント |
| `src/lib/queue/` | BullMQキュークライアント |
| `src/lib/tiktok/` | TikTok APIクライアント |
| `src/lib/image/` | 画像処理（sharp: リサイズ、WebP変換、サムネイル生成） |
| `src/lib/video/ffmpeg/` | FFmpeg動画処理（UGC加工、トリミング、結合、字幕、コーデック変換） |
| `src/lib/video/pipeline.ts` | 動画処理パイプライン（Remotion→FFmpeg→最適化） |
| `src/lib/video/variants.ts` | A/Bテスト用バリアント一括生成 |
| `src/lib/video/heygen/` | HeyGen APIクライアント |
| `src/lib/video/kling/` | Kling AI APIクライアント（PiAPI経由） |
| `src/lib/scraper/` | 商品URLスクレイパー（Amazon/楽天/一般サイト対応） |
| `src/remotion/` | Remotionテンプレート |
| `src/workers/` | バックグラウンドワーカー |
| `src/types/database.ts` | DB型定義 |
| `supabase/migrations/` | DBマイグレーション |
| `supabase/combined_migration.sql` | 統合マイグレーション（SQL Editor用） |
| `tests/e2e/` | Playwright E2Eテスト |
| `playwright.config.ts` | Playwright設定 |

---

## Remotionテンプレート

| テンプレート | 説明 | 時間 |
|------------|------|------|
| ProductIntro | 商品紹介動画 | 15秒 |
| BeforeAfter | 使用前後比較 | 12秒 |
| ReviewText | レビュー風テキストアニメーション | 10秒 |
| FeatureList | 特徴リスト | 15秒 |

---

## UGCエフェクト（FFmpeg）

| エフェクト | 説明 |
|-----------|------|
| camera_shake | 手ブレ効果 |
| film_grain | フィルムグレイン |
| vintage_filter | ヴィンテージ風 |
| phone_quality | スマホ撮影風 |
| selfie_mode | 自撮り風（左右反転） |

---

## バリアントプリセット（A/Bテスト用）

| プリセット | バリアント | 用途 |
|-----------|-----------|------|
| tiktok_ab | オリジナル / UGCライト / UGCヘビー / ヴィンテージ | TikTok A/Bテスト |
| multi_platform | TikTok / Instagram Reels / YouTube Shorts / Twitter | マルチプラットフォーム展開 |
| full_test | オリジナル / UGCライト / UGCミディアム / 字幕付き / UGC+字幕 | フルテスト |

---

## BullMQキュー

| キュー名 | 用途 |
|----------|------|
| video-generation | Remotion動画生成 |
| ugc-processing | UGC風加工 |
| heygen-generation | HeyGen動画生成 |
| kling-generation | Kling AI動画生成 |
| video-pipeline | 動画パイプライン処理 |
| video-variants | A/Bテストバリアント生成 |
| tiktok-posting | TikTok投稿 |
| analytics-collection | 分析データ収集 |

---

## データベーススキーマ

| テーブル | 説明 |
|----------|------|
| products | 商品マスタ（TikTok Shop連携） |
| videos | 動画マスタ |
| templates | テンプレート |
| video_analytics | 分析データ（時系列） |
| schedules | 投稿スケジュール |
| oauth_states | TikTok OAuth状態管理 |
| tiktok_accounts | TikTokアカウント情報 |

---

## API Routes

| エンドポイント | メソッド | 説明 |
|----------------|----------|------|
| `/api/videos/generate` | POST | 動画生成ジョブ作成 |
| `/api/videos/kling` | POST | Kling AI動画生成 |
| `/api/videos/[id]/status` | GET | 動画生成進捗取得 |
| `/api/videos/[id]/cancel` | POST | 動画生成キャンセル |
| `/api/scrape` | POST | 商品URL自動入力（スクレイピング+LLM分析） |
| `/api/images/optimize` | POST | 画像最適化・サムネイル生成（sharp） |
| `/api/videos/pipeline` | POST | 動画パイプライン処理（UGC+字幕+最適化） |
| `/api/videos/variants` | POST/GET | A/Bテスト用バリアント一括生成 |
| `/api/tiktok/auth` | GET | TikTok OAuth開始 |
| `/api/tiktok/callback` | GET | TikTok OAuthコールバック |
| `/api/auth/logout` | POST | ログアウト |

---

## 動画生成方式

| 方式 | 用途 | 料金 |
|------|------|------|
| Kling AI | WebCM風高品質動画（Image-to-Video） | $0.16〜/動画 |
| Remotion | テンプレートベースのモーショングラフィックス | 無料 |
| HeyGen | AIアバター商品紹介 | 有料 |
| FFmpeg | UGC風加工、素材リミックス | 無料 |

---

## 開発フェーズ

- [x] Phase 1: 基盤構築（Next.js + Supabase + UI）
- [x] Phase 2: 動画生成機能（Remotion + BullMQ）
- [x] Phase 3: UGC風・HeyGen連携
- [x] Phase 4: TikTok連携
- [x] Phase 5: 分析・最適化
- [x] Phase 6: データ連携完全実装（認証 + TanStack Query + CRUD）

---

## Claude Code スキル（ユーザーレベル）

| スキル | 説明 |
|--------|------|
| `/reco` | 9 subagent並列分析・全自動修正（セキュリティ/パフォーマンス/UX/機能完成度） |
| `/verify-worker-deployment` | ワーカーデプロイ検証（ローカル〜本番） |
| `/validate-api-integration` | API統合検証（Kling, TikTok, HeyGen等） |
| `/deploy-verify` | Vercel+Render統合デプロイ検証 |
| `/test-and-fix` | テスト実行・失敗分析・自動修正 |
| `/handoff` | セッション終了時の書き出し |
| `/resume` | セッション再開時の読み込み |
| `/quick-commit` | 高速コミット |

## Claude Code Subagent（ユーザーレベル）

| Subagent | 説明 |
|----------|------|
| `video-pipeline-analyzer` | 動画パイプライン分析・最適化 |
| `build-validator` | ビルド・型・リント・テスト検証 |
| `code-architect` | 設計レビュー・アーキテクチャ分析 |
| `ux-analyzer` | UI/UX問題検出・自動修正（/reco用） |
| `security-checker` | セキュリティ脆弱性検出・自動修正（/reco用） |
| `performance-profiler` | N+1クエリ・パフォーマンス最適化（/reco用） |
| `feature-completeness-checker` | TODO・未実装機能検出・自動修正（/reco用） |

---

## 解決済みの課題

| 問題 | 解決方法 |
|------|----------|
| Zod v4 `z.record()` | 2引数形式に変更 `z.record(z.string(), z.unknown())` |
| Zod v4 `error.errors` | `error.issues` に変更 |
| BullMQ + ioredis型衝突 | ioredis削除、ConnectionOptionsで直接指定 |
| Supabase insert型エラー | `as never` 型アサーション使用 |
| Supabase SSR型推論エラー | 明示的型定義 + `as TypeName` アサーション |
| Recharts Tooltip formatter | `value as number` でキャスト |
| Node.js fetch Buffer | `Blob` に変換して送信 |

---

## よくある間違いと修正

### Zod v4 API変更

```typescript
// NG
z.record(z.unknown())
// OK
z.record(z.string(), z.unknown())
```

### BullMQ接続

```typescript
// NG: ioredis直接使用
import Redis from 'ioredis'
const redis = new Redis(url)
new Queue('name', { connection: redis })

// OK: ConnectionOptions使用
import { ConnectionOptions } from 'bullmq'
const connection: ConnectionOptions = {
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
}
new Queue('name', { connection })
```

### Supabase SSR 型推論問題

```typescript
// NG: Supabase clientが`never`型を返す
const { data } = await supabase.from('products').select('*')
for (const p of data) { // error: p is never
  console.log(p.name)
}

// OK: 明示的型定義 + アサーション
type ProductRow = { id: string; name: string; price: number }
const { data } = await supabase.from('products').select('*')
const products = (data as ProductRow[] | null) ?? []
for (const p of products) {
  console.log(p.name)
}
```

---

# Claude Code Brain - 全プロジェクト共通設定

すべてのプロジェクトで適用される Claude Code の基本設定。

---

## 1. 運用方針

あなたは**マネージャー**であり**agentオーケストレーター**です。

### タスク判断基準

| タスクタイプ | 例 | 対応 |
|-------------|----|----|
| 複雑なタスク | 調査、分析、複数ファイル変更 | Subagent委託 |
| 単純なタスク | 1-2ファイルの明確な変更 | 直接実行 |
| 定型作業 | commit、test、review | Skill使用（`/スキル名`） |

### PDCAサイクル

- タスクを細分化して進捗管理（TodoWriteツール活用）
- 複数ステップの作業は必ずTodoに登録
- 完了したら即座にマーク

---

## 2. セッション管理

プロジェクト横断で使用できるセッション管理システム。

### 基本コマンド

| コマンド | 用途 |
|----------|------|
| `/handoff` | セッション終了時の書き出し |
| `/resume` | セッション再開時の読み込み |
| `/memory save` | 現在の対話を記憶として保存 |
| `/memory list` | 記憶一覧を表示 |
| `/memory recall [kw]` | キーワードで記憶を呼び出し |
| `/memory delete` | 記憶を削除 |
| `/update-brain` | この共通設定を更新 |

### 運用ルール

- **HANDOFF.mdは追記型** - 既存の完了タスク・履歴を削除しない
- **セッション履歴は新しい順** - 最新を先頭に追加
- **永続的な知識はCLAUDE.mdへ** - プロジェクト固有設定に反映
