# BuzzWriteYear - プロジェクト設定

このプロジェクト固有の設定。共通設定（~/.claude/CLAUDE.md）を継承。

---

## プロジェクト概要

**TikTok Shop GMV最大化**のための動画自動生成・投稿・分析プラットフォーム

- 商品訴求動画を大量生成（Remotion + HeyGen + FFmpeg）
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
| Video Gen | Remotion (60%) + HeyGen (20%) + FFmpeg (20%) |
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
```

### 環境変数

`.env.example` を `.env.local` にコピーして設定:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
HEYGEN_API_KEY=
REDIS_URL=
```

---

## Key Files

| ファイル | 役割 |
|----------|------|
| `src/app/(dashboard)/` | ダッシュボードページ群 |
| `src/components/layout/` | Sidebar, Header |
| `src/components/product/` | 商品関連コンポーネント |
| `src/lib/supabase/` | Supabaseクライアント |
| `src/types/database.ts` | DB型定義 |
| `supabase/migrations/` | DBマイグレーション |

---

## データベーススキーマ

| テーブル | 説明 |
|----------|------|
| products | 商品マスタ（TikTok Shop連携） |
| videos | 動画マスタ |
| templates | テンプレート |
| video_analytics | 分析データ（時系列） |
| schedules | 投稿スケジュール |

---

## 動画生成方式

| 方式 | 用途 | 割合 |
|------|------|------|
| Remotion | 商品紹介、比較、レビュー風 | 60% |
| HeyGen | AIアバター商品紹介 | 20% |
| FFmpeg | UGC風加工、素材リミックス | 20% |

---

## 開発フェーズ

- [x] Phase 1: 基盤構築（Next.js + Supabase + UI）
- [ ] Phase 2: 動画生成機能（Remotion + BullMQ）
- [ ] Phase 3: UGC風・HeyGen連携
- [ ] Phase 4: TikTok連携
- [ ] Phase 5: 分析・最適化

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

### HANDOFF.md テンプレート

```markdown
# HANDOFF - セッション引き継ぎ

## 現在の状態

### 完了したタスク
- [x] タスク1
- [x] タスク2

### 作業中のタスク
- [ ] タスク3

## 次のアクション
1. 優先度高のアクション
2. 次のアクション

## 未解決の問題
- 問題と原因、対応方針

## 未コミット変更
```
git status --short の出力
```

## 最新コミット
```
git log -1 --oneline の出力
```

## セッション履歴

### YYYY-MM-DD
- 今回やったこと
```

### 運用ルール

- **HANDOFF.mdは追記型** - 既存の完了タスク・履歴を削除しない
- **セッション履歴は新しい順** - 最新を先頭に追加
- **永続的な知識はCLAUDE.mdへ** - プロジェクト固有設定に反映

---

## 3. Skill定義テンプレート

### 基本構造

```markdown
---
description: "[Skill名] - [1行説明]"
---

[実行手順を番号付きで記載]

1. ステップ1
2. ステップ2
...
```

### Git系スキル

| スキル | 用途 |
|--------|------|
| `/commit-push-pr` | status確認→diff→add→commit→push→PR作成 |
| `/quick-commit` | 高速コミット（conventional commits形式） |

### 品質管理スキル

| スキル | 用途 |
|--------|------|
| `/test-and-fix` | テスト実行→失敗分析→修正→再実行 |
| `/review-changes` | 未コミット変更のレビュー |
| `/first-principles` | 問題の根本分析 |

---

## 4. Subagent定義テンプレート

### 基本構造

```markdown
---
name: [agent-name]
description: [用途説明]
tools: [Read, Grep, Glob, Bash, ...]
model: haiku | inherit
---

# [Agent Name]

あなたは[専門領域]のスペシャリストです。

## 役割
[具体的な責務]

## 実行手順
1. ...
2. ...

## 出力フォーマット
[期待する出力形式]

## 注意事項
- ...
```

### 開発用Subagent

| Agent | 用途 | ツール | モデル |
|-------|------|--------|--------|
| `build-validator` | ビルド・型・リント・テスト検証 | Bash | inherit |
| `code-architect` | 設計レビュー・アーキテクチャ分析 | Read, Grep | inherit |
| `code-simplifier` | コード簡潔化・リファクタリング | Read, Edit | inherit |

---

## 5. Claude Code Web同期

別PCやWeb版との作業引き継ぎが可能。

### コマンド一覧

| コマンド | 説明 |
|----------|------|
| `& メッセージ` | Web版で新規セッション作成（バックグラウンド） |
| `claude --teleport` | Web版セッションをローカルに復帰 |
| `claude --remote "タスク"` | CLIからWeb版セッション作成 |

### 別PC引き継ぎ手順

1. 元のPCで `& タスク内容` でWeb版セッション作成
2. 新しいPCで同じリポジトリをチェックアウト
3. `claude --teleport` でセッション選択・復帰

### 要件

- 同じClaude.aiアカウントで認証
- 同じリポジトリがチェックアウト済み
- Gitがクリーンな状態（未コミット変更なし）
- GitHubリポジトリのみ対応

---

## 6. プロジェクト連携

### ディレクトリ優先順位

```
1. ~/.claude/CLAUDE.md        ← ユーザーレベル（この共通設定）
2. プロジェクト/CLAUDE.md     ← プロジェクトレベル（固有設定）
3. .claude/commands/          ← スキル定義
4. .claude/agents/            ← Subagent定義
```

### 推奨構成

```
~/.claude/
├── CLAUDE.md                 # 共通設定（このファイル）
├── commands/                 # 共通スキル
│   ├── handoff.md
│   ├── resume.md
│   ├── memory.md
│   ├── update-brain.md       # この設定を更新
│   ├── commit-push-pr.md
│   ├── quick-commit.md
│   ├── test-and-fix.md
│   ├── review-changes.md
│   └── first-principles.md
└── agents/                   # 共通Subagent
    ├── build-validator.md
    ├── code-architect.md
    └── code-simplifier.md

プロジェクト/
├── CLAUDE.md                 # プロジェクト固有設定
├── HANDOFF.md                # セッション引き継ぎ
└── .claude/
    ├── commands/             # プロジェクト固有スキル
    ├── agents/               # プロジェクト固有Subagent
    └── memories/             # 記憶
```

### オーバーライドルール

- プロジェクトCLAUDE.mdは共通設定を**拡張**（上書きではない）
- 同名のスキル/Subagentはプロジェクト側が**優先**
- セッション管理（HANDOFF.md, memories/）は**プロジェクト単位**で管理

---

## 7. よくあるパターン

### 新プロジェクト開始時

1. プロジェクト/CLAUDE.md にプロジェクト固有の情報を記載
2. 必要に応じて .claude/commands/, .claude/agents/ を追加
3. `/resume` で前回の状態を確認（HANDOFF.mdがあれば）

### セッション終了時

1. `/handoff` でHANDOFF.mdに追記
2. 永続的な知識はCLAUDE.mdに反映
3. オプション：コミット＆プッシュ

### 作業中の記録

1. `/memory save` で細かい調査結果を保存
2. `/memory recall [kw]` で過去の調査を呼び出し
3. 重要な知見は `/handoff` でCLAUDE.mdに永続化
