#!/usr/bin/env npx tsx
/**
 * UGCスタイル学習スクリプト
 *
 * 使用方法:
 *   npx dotenv -e .env.local -- npx tsx scripts/learn-style.ts @username
 *   npx dotenv -e .env.local -- npx tsx scripts/learn-style.ts https://www.tiktok.com/@username
 *
 * 出力:
 *   docs/account-analysis/styles/<username>.json
 */

import { getTikTokInsight, TikTokVideo, TikTokUser, downloadTikTokVideo } from '../src/lib/sns/tiktok-scraper'
import { analyzeVideoWithGemini } from '../src/lib/sns/gemini'
import { calculateEngagement, formatCount, formatPercent } from '../src/lib/sns/metrics'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import {
  UGCStyleExportJSON,
  StyleProfile,
  GenerationParams,
  EMPTY_STYLE_PROFILE,
  EMPTY_GENERATION_PARAMS,
} from '../src/types/ugc-style'

// 設定
const VIDEO_COUNT = 10  // 取得する動画数
const TOP_N = 5         // 分析する動画数

/**
 * メイン処理
 */
async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.error('使用方法: npx tsx scripts/learn-style.ts <@username または TikTok URL>')
    console.error('例: npx tsx scripts/learn-style.ts @luana.beauty.2nd')
    process.exit(1)
  }

  const input = args[0]

  // 環境変数チェック
  if (!process.env.TIKTOK_RAPIDAPI_KEY && !process.env.RAPIDAPI_KEY) {
    console.error('エラー: TIKTOK_RAPIDAPI_KEY または RAPIDAPI_KEY が設定されていません')
    process.exit(1)
  }

  if (!process.env.GEMINI_API_KEY) {
    console.error('エラー: GEMINI_API_KEY が設定されていません')
    process.exit(1)
  }

  console.log('====================================')
  console.log('UGCスタイル学習')
  console.log('====================================\n')

  try {
    // 1. プロフィールと動画を取得
    console.log(`[1/4] プロフィール取得中: ${input}`)
    const insight = await getTikTokInsight(input, VIDEO_COUNT)
    console.log(`  ✓ ${insight.user.nickname} (@${insight.user.uniqueId})`)
    console.log(`  ✓ ${insight.videos.length}件の動画を取得\n`)

    // 2. Top動画を特定
    console.log('[2/4] Top動画を選定中...')
    const topVideos = rankVideos(insight.videos).slice(0, TOP_N)
    console.log(`  ✓ Top ${topVideos.length}動画を選定\n`)

    // 3. スタイル分析（AI）
    console.log('[3/4] スタイル分析中（Gemini 2.0）...')
    console.log(`  ${topVideos.length}件の動画を分析します（約${topVideos.length * 20}秒）\n`)

    const styleAnalysis = await analyzeStyleFromVideos(topVideos)
    console.log(`  ✓ スタイル分析完了\n`)

    // 4. JSONテンプレート生成・保存
    console.log('[4/4] スタイルテンプレート生成中...')
    const styleTemplate = createStyleTemplate(
      insight.user,
      insight.videos.length,
      styleAnalysis
    )

    // 保存
    const stylesDir = join(process.cwd(), 'docs', 'account-analysis', 'styles')
    await mkdir(stylesDir, { recursive: true })

    const styleId = insight.user.uniqueId.replace(/[^a-zA-Z0-9]/g, '_')
    const filepath = join(stylesDir, `${styleId}.json`)
    await writeFile(filepath, JSON.stringify(styleTemplate, null, 2))
    console.log(`  ✓ スタイルテンプレート保存: ${filepath}\n`)

    // 結果を表示
    console.log('====================================')
    console.log('スタイル学習完了')
    console.log('====================================\n')

    console.log(`スタイルID: ${styleId}`)
    console.log(`保存先: ${filepath}\n`)

    console.log('【スタイル概要】')
    console.log(`  全体の雰囲気: ${styleTemplate.overallVibe}`)
    console.log(`  キーワード: ${styleTemplate.keywords.join(', ')}`)
    console.log('')
    console.log('【カメラワーク】')
    console.log(`  スタイル: ${styleTemplate.styleProfile.cameraWork.dominantStyle}`)
    console.log(`  手ブレ強度: ${styleTemplate.styleProfile.cameraWork.shakeIntensity}`)
    console.log('')
    console.log('【編集スタイル】')
    console.log(`  テンポ: ${styleTemplate.styleProfile.editStyle.pacing}`)
    console.log(`  平均クリップ長: ${styleTemplate.styleProfile.editStyle.avgClipDuration}秒`)
    console.log('')
    console.log('【視覚スタイル】')
    console.log(`  色調: ${styleTemplate.styleProfile.visualStyle.colorTone}`)
    console.log(`  フィルター: ${styleTemplate.styleProfile.visualStyle.filterLook}`)
    console.log('')
    console.log('【生成パラメータ】')
    console.log(`  Klingプロンプト: ${styleTemplate.generationParams.klingPromptSuffix.substring(0, 100)}...`)
    console.log(`  FFmpegエフェクト: ${styleTemplate.generationParams.ffmpegEffects.effects.join(', ')}`)
    console.log('')
    console.log('使用方法:')
    console.log(`  /generate-like ${styleId} --image product.jpg`)

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
    return engB.totalER - engA.totalER
  })
}

/**
 * 動画群からスタイルを分析
 */
async function analyzeStyleFromVideos(
  videos: TikTokVideo[]
): Promise<{
  styleProfile: StyleProfile
  generationParams: GenerationParams
  keywords: string[]
  overallVibe: string
}> {
  // 動画をダウンロードして分析
  const analysisResults: string[] = []

  for (const video of videos) {
    try {
      console.log(`  分析中: ${video.desc.substring(0, 30)}...`)
      const videoUrl = `https://www.tiktok.com/@${video.author.uniqueId}/video/${video.id}`
      const buffer = await downloadTikTokVideo(videoUrl)
      const analysis = await analyzeVideoWithGemini(buffer, getStyleExtractionPrompt())
      analysisResults.push(analysis)
    } catch (error) {
      console.error(`  スキップ (${video.id}): 分析失敗`)
    }
  }

  if (analysisResults.length === 0) {
    console.log('  警告: 分析できた動画がありません。デフォルトスタイルを使用します。')
    return {
      styleProfile: EMPTY_STYLE_PROFILE,
      generationParams: EMPTY_GENERATION_PARAMS,
      keywords: ['product', 'tiktok', 'ugc'],
      overallVibe: 'カジュアルな商品紹介',
    }
  }

  // 分析結果を統合
  return synthesizeStyleFromAnalyses(analysisResults)
}

/**
 * スタイル抽出用プロンプト
 */
function getStyleExtractionPrompt(): string {
  return `この動画のスタイルを詳細に分析してください。

## 出力形式（必ずこの形式で）

### カメラワーク
- スタイル: [handheld/tripod/gimbal]
- 手ブレ強度: [0-1の数値]
- 動き: [主な動き（zoom, pan, static等）]

### 編集スタイル
- テンポ: [slow/medium/fast]
- 平均クリップ長: [秒数]
- トランジション: [cut/fade/なし等]
- ジャンプカット: [あり/なし]

### 視覚スタイル
- 色調: [warm/cool/neutral]
- フィルター: [vintage/modern/raw/cinematic]
- 彩度: [muted/natural/vibrant]
- コントラスト: [low/medium/high]

### モーション
- 被写体の動き: [static/subtle/active]
- カメラの動き: [rare/occasional/frequent]

### 音声
- BGM: [あり/なし]
- ジャンル: [pop/lofi/electronic等]
- ナレーション: [あり/なし]

### キーワード
[この動画を表す3-5個のキーワード]

### 全体の雰囲気
[1文で表現]

### Kling AI用プロンプト
[この動画風の動画を生成するための英語プロンプト]`
}

/**
 * 分析結果を統合してスタイルプロファイルを生成
 */
function synthesizeStyleFromAnalyses(
  analyses: string[]
): {
  styleProfile: StyleProfile
  generationParams: GenerationParams
  keywords: string[]
  overallVibe: string
} {
  // 各分析からパラメータを抽出
  const cameraStyles: string[] = []
  const shakeIntensities: number[] = []
  const pacings: string[] = []
  const clipDurations: number[] = []
  const colorTones: string[] = []
  const filterLooks: string[] = []
  const keywords: string[] = []
  const vibes: string[] = []
  const prompts: string[] = []

  for (const analysis of analyses) {
    // カメラスタイル
    const styleMatch = analysis.match(/スタイル[：:]\s*(handheld|tripod|gimbal)/i)
    if (styleMatch) cameraStyles.push(styleMatch[1].toLowerCase())

    // 手ブレ強度
    const shakeMatch = analysis.match(/手ブレ強度[：:]\s*([\d.]+)/i)
    if (shakeMatch) shakeIntensities.push(parseFloat(shakeMatch[1]))

    // テンポ
    const pacingMatch = analysis.match(/テンポ[：:]\s*(slow|medium|fast)/i)
    if (pacingMatch) pacings.push(pacingMatch[1].toLowerCase())

    // クリップ長
    const clipMatch = analysis.match(/平均クリップ長[：:]\s*([\d.]+)/i)
    if (clipMatch) clipDurations.push(parseFloat(clipMatch[1]))

    // 色調
    const toneMatch = analysis.match(/色調[：:]\s*(warm|cool|neutral)/i)
    if (toneMatch) colorTones.push(toneMatch[1].toLowerCase())

    // フィルター
    const filterMatch = analysis.match(/フィルター[：:]\s*(vintage|modern|raw|cinematic)/i)
    if (filterMatch) filterLooks.push(filterMatch[1].toLowerCase())

    // キーワード
    const keywordMatch = analysis.match(/キーワード[^]*?\n([^\n]+)/i)
    if (keywordMatch) {
      const kws = keywordMatch[1].split(/[,、]/).map(k => k.trim())
      keywords.push(...kws)
    }

    // 雰囲気
    const vibeMatch = analysis.match(/全体の雰囲気[^]*?\n([^\n]+)/i)
    if (vibeMatch) vibes.push(vibeMatch[1].trim())

    // プロンプト
    const promptMatch = analysis.match(/Kling AI用プロンプト[^]*?\n([^\n]+)/i)
    if (promptMatch) prompts.push(promptMatch[1].trim())
  }

  // 最頻値を計算
  const dominantCameraStyle = getMostFrequent(cameraStyles, 'handheld') as 'handheld' | 'tripod' | 'gimbal' | 'mixed'
  const avgShakeIntensity = average(shakeIntensities) || 0.3
  const dominantPacing = getMostFrequent(pacings, 'medium') as 'slow' | 'medium' | 'fast'
  const avgClipDuration = average(clipDurations) || 2.5
  const dominantColorTone = getMostFrequent(colorTones, 'neutral') as 'warm' | 'cool' | 'neutral'
  const dominantFilterLook = getMostFrequent(filterLooks, 'raw')

  // FFmpegエフェクトを決定
  const ffmpegEffects: ('camera_shake' | 'film_grain' | 'vintage_filter' | 'phone_quality' | 'selfie_mode')[] = []
  if (avgShakeIntensity > 0.2) ffmpegEffects.push('camera_shake')
  if (dominantFilterLook === 'vintage') {
    ffmpegEffects.push('vintage_filter')
    ffmpegEffects.push('film_grain')
  }
  if (dominantCameraStyle === 'handheld') ffmpegEffects.push('phone_quality')

  const intensity = avgShakeIntensity > 0.6 ? 'heavy' : avgShakeIntensity > 0.3 ? 'medium' : 'light'

  // Klingプロンプトを生成
  const basePrompt = prompts[0] || 'Product demonstration video, casual TikTok style'
  const promptSuffix = `${basePrompt}, ${dominantCameraStyle} camera, ${dominantPacing} pacing, ${dominantColorTone} color tone`

  return {
    styleProfile: {
      cameraWork: {
        dominantStyle: dominantCameraStyle,
        shakeIntensity: avgShakeIntensity,
        zoomUsage: 0.3,
        panUsage: 0.2,
        commonMovements: ['zoom', 'pan'],
      },
      editStyle: {
        pacing: dominantPacing,
        avgClipDuration,
        transitionTypes: ['cut'],
        hasJumpCuts: dominantPacing === 'fast',
        beatSync: false,
      },
      visualStyle: {
        colorTone: dominantColorTone,
        filterLook: dominantFilterLook,
        contrast: 'medium',
        saturation: 'natural',
        dominantColors: [],
      },
      motionStyle: {
        intensity: dominantPacing === 'fast' ? 'dynamic' : dominantPacing === 'slow' ? 'subtle' : 'moderate',
        subjectMovement: 'subtle',
        cameraMovement: dominantCameraStyle === 'handheld' ? 'frequent' : 'occasional',
      },
      audioStyle: {
        hasBGM: true,
        hasVoiceover: true,
        musicGenre: 'pop',
        sfxUsage: 'light',
      },
    },
    generationParams: {
      klingPromptSuffix: promptSuffix,
      klingNegativePrompt: 'blurry, low quality, distorted, ugly, deformed',
      motionPresetId: 'product_reveal',
      cameraPresetId: 'product_showcase',
      ffmpegEffects: {
        effects: ffmpegEffects.length > 0 ? ffmpegEffects : ['camera_shake', 'phone_quality'],
        intensity,
      },
    },
    keywords: [...new Set(keywords)].slice(0, 5),
    overallVibe: vibes[0] || 'カジュアルな商品紹介動画',
  }
}

/**
 * スタイルテンプレートを作成
 */
function createStyleTemplate(
  user: TikTokUser,
  videoCount: number,
  analysis: {
    styleProfile: StyleProfile
    generationParams: GenerationParams
    keywords: string[]
    overallVibe: string
  }
): UGCStyleExportJSON {
  return {
    version: '1.0',
    name: `${user.uniqueId} スタイル`,
    description: `@${user.uniqueId} のTikTok投稿スタイルを学習したテンプレート`,
    createdAt: new Date().toISOString(),
    sampleCount: videoCount,
    styleProfile: analysis.styleProfile,
    generationParams: analysis.generationParams,
    keywords: analysis.keywords,
    overallVibe: analysis.overallVibe,
  }
}

/**
 * ユーティリティ: 最頻値を取得
 */
function getMostFrequent<T>(arr: T[], defaultValue: T): T {
  if (arr.length === 0) return defaultValue
  const counts = new Map<T, number>()
  for (const item of arr) {
    counts.set(item, (counts.get(item) || 0) + 1)
  }
  let maxCount = 0
  let mostFrequent = defaultValue
  for (const [item, count] of counts) {
    if (count > maxCount) {
      maxCount = count
      mostFrequent = item
    }
  }
  return mostFrequent
}

/**
 * ユーティリティ: 平均値を計算
 */
function average(arr: number[]): number | null {
  if (arr.length === 0) return null
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

// 実行
main().catch(console.error)
