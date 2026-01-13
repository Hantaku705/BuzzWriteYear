#!/usr/bin/env npx tsx
/**
 * TikTokアカウント分析スクリプト
 *
 * 使用方法:
 *   npx dotenv -e .env.local -- npx tsx scripts/analyze-account.ts @username
 *   npx dotenv -e .env.local -- npx tsx scripts/analyze-account.ts https://www.tiktok.com/@username
 */

import { getTikTokInsight, TikTokVideo, TikTokUser } from '../src/lib/sns/tiktok-scraper'
import { downloadTikTokVideo } from '../src/lib/sns/tiktok-scraper'
import { analyzeVideoWithGemini } from '../src/lib/sns/gemini'
import {
  calculateEngagement,
  generateMetricsSummary,
  formatCount,
  formatPercent,
  VideoMetrics,
  EngagementRates,
} from '../src/lib/sns/metrics'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

// 設定
const VIDEO_COUNT = 10  // 取得する動画数
const TOP_N = 3         // Top N動画
const PARALLEL_ANALYSIS = 3  // 並列分析数

/**
 * メイン処理
 */
async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.error('使用方法: npx tsx scripts/analyze-account.ts <@username または TikTok URL>')
    console.error('例: npx tsx scripts/analyze-account.ts @luana.beauty.2nd')
    console.error('例: npx tsx scripts/analyze-account.ts https://www.tiktok.com/@luana.beauty.2nd')
    process.exit(1)
  }

  const input = args[0]

  // 環境変数チェック
  if (!process.env.TIKTOK_RAPIDAPI_KEY && !process.env.RAPIDAPI_KEY) {
    console.error('エラー: TIKTOK_RAPIDAPI_KEY または RAPIDAPI_KEY が設定されていません')
    console.error('.env.local に以下を追加してください:')
    console.error('  TIKTOK_RAPIDAPI_KEY=xxx')
    process.exit(1)
  }

  if (!process.env.GEMINI_API_KEY) {
    console.error('エラー: GEMINI_API_KEY が設定されていません')
    console.error('.env.local に以下を追加してください:')
    console.error('  GEMINI_API_KEY=xxx')
    process.exit(1)
  }

  console.log('====================================')
  console.log('TikTokアカウント分析')
  console.log('====================================\n')

  try {
    // 1. プロフィールと動画を取得
    console.log(`[1/5] プロフィール取得中: ${input}`)
    const insight = await getTikTokInsight(input, VIDEO_COUNT)
    console.log(`  ✓ ${insight.user.nickname} (@${insight.user.uniqueId})`)
    console.log(`  ✓ ${insight.videos.length}件の動画を取得\n`)

    // 2. エンゲージメント計算
    console.log('[2/5] エンゲージメント率計算中...')
    const summary = generateMetricsSummary(insight.aggregatedMetrics)
    console.log(`  ✓ 平均LVR: ${formatPercent(summary.engagement.lvr)} (${summary.benchmarkComparison.lvr.label})\n`)

    // 3. Top動画を特定
    console.log('[3/5] Top動画を分析中...')
    const rankedVideos = rankVideos(insight.videos)
    const topVideos = rankedVideos.slice(0, TOP_N)
    console.log(`  ✓ Top ${TOP_N}動画を特定\n`)

    // 4. AI分析（並列）
    console.log('[4/5] AI動画分析中（Gemini 2.0）...')
    console.log(`  ${topVideos.length}件の動画を分析します（約${topVideos.length * 15}秒）\n`)

    const analyses = await analyzeVideosInParallel(topVideos, PARALLEL_ANALYSIS)
    console.log(`  ✓ ${analyses.length}件の分析完了\n`)

    // 5. レポート生成
    console.log('[5/5] レポート生成中...')
    const report = generateReport(insight.user, insight.videos, summary, topVideos, analyses)

    // レポートを保存
    const reportDir = join(process.cwd(), 'docs', 'account-analysis', 'reports')
    await mkdir(reportDir, { recursive: true })

    const date = new Date().toISOString().split('T')[0]
    const filename = `${insight.user.uniqueId}_${date}.md`
    const filepath = join(reportDir, filename)
    await writeFile(filepath, report)
    console.log(`  ✓ レポート保存: ${filepath}\n`)

    // レポートを出力
    console.log('====================================')
    console.log('分析レポート')
    console.log('====================================\n')
    console.log(report)

  } catch (error) {
    console.error('エラーが発生しました:', error)
    process.exit(1)
  }
}

/**
 * 動画をエンゲージメント率でランキング
 */
function rankVideos(videos: TikTokVideo[]): TikTokVideo[] {
  return [...videos].sort((a, b) => {
    const engA = calculateEngagement(a.metrics)
    const engB = calculateEngagement(b.metrics)
    // 総エンゲージメント率でソート
    return engB.totalER - engA.totalER
  })
}

/**
 * 動画を並列でAI分析
 */
async function analyzeVideosInParallel(
  videos: TikTokVideo[],
  concurrency: number
): Promise<{ video: TikTokVideo; analysis: string }[]> {
  const results: { video: TikTokVideo; analysis: string }[] = []

  for (let i = 0; i < videos.length; i += concurrency) {
    const batch = videos.slice(i, i + concurrency)
    const batchResults = await Promise.all(
      batch.map(async (video) => {
        try {
          console.log(`  分析中: ${video.desc.substring(0, 30)}...`)
          const videoUrl = `https://www.tiktok.com/@${video.author.uniqueId}/video/${video.id}`
          const buffer = await downloadTikTokVideo(videoUrl)
          const analysis = await analyzeVideoWithGemini(buffer, getAnalysisPrompt())
          return { video, analysis }
        } catch (error) {
          console.error(`  エラー (${video.id}):`, error)
          return { video, analysis: 'AI分析に失敗しました' }
        }
      })
    )
    results.push(...batchResults)
  }

  return results
}

/**
 * 分析プロンプト
 */
function getAnalysisPrompt(): string {
  return `この動画のバズ要因を分析してください。簡潔に回答してください。

### 出力形式（必ずこの形式で）

**フック（冒頭3秒）**: （何が映っているか、どう引きつけているか）

**構成**: （カット数、テンポ、展開の特徴）

**音声/音楽**: （BGM、ナレーション、効果音の特徴）

**CTA**: （最後の誘導方法）

**バズ要因スコア**:
- フック力: /5
- 稀有度: /5
- 情報密度: /5
- エンタメ性: /5
- CTA力: /5

**成功の要因（一言）**: （このコンテンツが伸びた最大の理由）`
}

/**
 * レポート生成
 */
function generateReport(
  user: TikTokUser,
  videos: TikTokVideo[],
  summary: ReturnType<typeof generateMetricsSummary>,
  topVideos: TikTokVideo[],
  analyses: { video: TikTokVideo; analysis: string }[]
): string {
  const now = new Date()
  const dateStr = now.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })

  // 平均メトリクス計算
  const avgMetrics: VideoMetrics = {
    playCount: Math.round(videos.reduce((sum, v) => sum + v.metrics.playCount, 0) / videos.length),
    likeCount: Math.round(videos.reduce((sum, v) => sum + v.metrics.likeCount, 0) / videos.length),
    commentCount: Math.round(videos.reduce((sum, v) => sum + v.metrics.commentCount, 0) / videos.length),
    shareCount: Math.round(videos.reduce((sum, v) => sum + v.metrics.shareCount, 0) / videos.length),
    collectCount: Math.round(videos.reduce((sum, v) => sum + (v.metrics.collectCount || 0), 0) / videos.length),
  }
  const avgEngagement = calculateEngagement(avgMetrics)

  // 共通パターンを抽出
  const patterns = extractPatterns(topVideos, analyses)

  let report = `# @${user.uniqueId} 分析レポート

**分析日時**: ${dateStr}
**対象動画**: 直近${videos.length}件

---

## アカウント概要

| 指標 | 値 | 備考 |
|------|-----|------|
| フォロワー | ${formatCount(user.followerCount)} | - |
| 総いいね | ${formatCount(user.heartCount)} | - |
| 動画数 | ${user.videoCount} | - |
| 認証バッジ | ${user.verified ? '✓' : '-'} | - |

### エンゲージメント率（直近${videos.length}件平均）

| 指標 | 値 | 業界平均比 | 評価 |
|------|-----|----------|------|
| LVR（いいね率） | ${formatPercent(avgEngagement.lvr)} | ${summary.benchmarkComparison.lvr.ratio.toFixed(2)}x | ${summary.benchmarkComparison.lvr.label} |
| CVR（コメント率） | ${formatPercent(avgEngagement.cvr, 3)} | ${summary.benchmarkComparison.cvr.ratio.toFixed(2)}x | ${summary.benchmarkComparison.cvr.label} |
| SVR（シェア率） | ${formatPercent(avgEngagement.svr, 3)} | ${summary.benchmarkComparison.svr.ratio.toFixed(2)}x | ${summary.benchmarkComparison.svr.label} |
| 保存率 | ${formatPercent(avgEngagement.saveRate, 3)} | ${summary.benchmarkComparison.saveRate.ratio.toFixed(2)}x | ${summary.benchmarkComparison.saveRate.label} |
| 総ER | ${formatPercent(avgEngagement.totalER)} | ${summary.benchmarkComparison.totalER.ratio.toFixed(2)}x | ${summary.benchmarkComparison.totalER.label} |

---

## Top ${TOP_N} 動画

`

  // Top動画テーブル
  report += `| # | 再生数 | LVR | 内容 |
|---|--------|-----|------|
`

  topVideos.forEach((video, i) => {
    const eng = calculateEngagement(video.metrics)
    const desc = video.desc.substring(0, 40).replace(/\n/g, ' ')
    report += `| ${i + 1} | ${formatCount(video.metrics.playCount)} | ${formatPercent(eng.lvr)} | ${desc}... |\n`
  })

  report += `\n---\n\n## AI分析結果\n\n`

  // 各動画のAI分析
  analyses.forEach(({ video, analysis }, i) => {
    const eng = calculateEngagement(video.metrics)
    report += `### ${i + 1}. ${video.desc.substring(0, 50)}...

**再生数**: ${formatCount(video.metrics.playCount)} | **LVR**: ${formatPercent(eng.lvr)} | **投稿日**: ${new Date(video.createTime * 1000).toLocaleDateString('ja-JP')}

${analysis}

---

`
  })

  // 成功パターン
  report += `## 成功パターン（共通点）

${patterns.map((p, i) => `${i + 1}. **${p.category}**: ${p.description}`).join('\n')}

---

## モデリングポイント

| 要素 | 真似すべき点 | 自社適用案 |
|------|------------|----------|
`

  patterns.forEach(p => {
    report += `| ${p.category} | ${p.description} | ${p.application} |\n`
  })

  report += `
---

## 次のアクション

1. **即実践**: ${patterns[0]?.description || 'Top動画のフック構成を参考にする'}
2. **テスト**: ${patterns[1]?.description || 'テンポ感を真似した動画を作成'}
3. **継続分析**: 1週間後に再度分析して効果を確認

---

*Generated by BuzzWriteYear Account Analyzer*
`

  return report
}

/**
 * 共通パターンを抽出
 */
function extractPatterns(
  videos: TikTokVideo[],
  analyses: { video: TikTokVideo; analysis: string }[]
): { category: string; description: string; application: string }[] {
  // 分析テキストからパターンを抽出（簡易版）
  const patterns: { category: string; description: string; application: string }[] = []

  // フック分析
  const hookMentions = analyses
    .map(a => a.analysis.match(/フック[（(]冒頭.*?[)）][：:]\s*(.+)/)?.[1])
    .filter(Boolean)
  if (hookMentions.length > 0) {
    patterns.push({
      category: 'フック',
      description: hookMentions[0] || '冒頭3秒で商品/結果を見せる',
      application: '商品のビフォーアフターを冒頭に配置',
    })
  }

  // 構成分析
  const structureMentions = analyses
    .map(a => a.analysis.match(/構成[：:]\s*(.+)/)?.[1])
    .filter(Boolean)
  if (structureMentions.length > 0) {
    patterns.push({
      category: 'テンポ',
      description: structureMentions[0] || '2-3秒でカット切り替え',
      application: 'Kling AIで2秒クリップを生成し連結',
    })
  }

  // 音声/音楽分析
  const audioMentions = analyses
    .map(a => a.analysis.match(/音[声楽].*?[：:]\s*(.+)/)?.[1])
    .filter(Boolean)
  if (audioMentions.length > 0) {
    patterns.push({
      category: '音楽/音声',
      description: audioMentions[0] || 'トレンドBGMを使用',
      application: 'TikTokトレンド音楽をリサーチして使用',
    })
  }

  // CTA分析
  const ctaMentions = analyses
    .map(a => a.analysis.match(/CTA[：:]\s*(.+)/)?.[1])
    .filter(Boolean)
  if (ctaMentions.length > 0) {
    patterns.push({
      category: 'CTA',
      description: ctaMentions[0] || 'プロフィールリンクへ誘導',
      application: '「詳細はプロフィールから」を統一フレーズに',
    })
  }

  // デフォルトパターン（分析が取れなかった場合）
  if (patterns.length === 0) {
    patterns.push(
      { category: 'フック', description: '冒頭で視聴者の興味を引く', application: '商品の効果を最初に見せる' },
      { category: 'テンポ', description: '短いカットで飽きさせない', application: '2-3秒でシーン切り替え' },
      { category: 'CTA', description: 'アクションを明確に促す', application: '「今すぐチェック」を追加' },
    )
  }

  return patterns
}

// 実行
main().catch(console.error)
