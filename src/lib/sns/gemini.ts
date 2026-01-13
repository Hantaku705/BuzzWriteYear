/**
 * Gemini 2.0 Flash 動画分析
 * 動画コンテンツのAI分析機能
 */

import { GoogleAIFileManager, FileState } from '@google/generative-ai/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

/**
 * 動画分析結果
 */
export interface VideoAnalysisResult {
  summary: string           // 概要
  narration: string         // ナレーション要約
  cutCount: number          // カット数
  avgCutDuration: number    // 平均カット時間
  timeline: TimelineEntry[] // タイムライン
  buzzFactors: BuzzFactor[] // バズ要因
  improvements: string[]    // 改善提案
  rawAnalysis: string       // 生の分析テキスト
}

/**
 * タイムラインエントリ
 */
export interface TimelineEntry {
  startTime: string   // 開始時間 (e.g., "0:00")
  endTime: string     // 終了時間
  content: string     // 内容
  point: string       // ポイント
}

/**
 * バズ要因
 */
export interface BuzzFactor {
  name: string        // 指標名
  score: number       // スコア (1-5)
  reason: string      // 理由
}

/**
 * 動画をGeminiで分析
 */
export async function analyzeVideoWithGemini(
  videoBuffer: Buffer,
  prompt?: string,
  mimeType: string = 'video/mp4'
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set')
  }

  const fileManager = new GoogleAIFileManager(GEMINI_API_KEY)
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)

  // 1. 一時ファイルに保存
  const ext = mimeType.split('/')[1] || 'mp4'
  const filePath = join(tmpdir(), `video_${Date.now()}.${ext}`)
  await writeFile(filePath, videoBuffer)

  try {
    // 2. Geminiにアップロード
    const uploadResult = await fileManager.uploadFile(filePath, {
      mimeType,
      displayName: `video-${Date.now()}`,
    })

    // 3. 処理完了待機
    let file = await fileManager.getFile(uploadResult.file.name)
    let waitCount = 0
    const maxWait = 30 // 最大60秒待機

    while (file.state === FileState.PROCESSING && waitCount < maxWait) {
      await new Promise(resolve => setTimeout(resolve, 2000))
      file = await fileManager.getFile(uploadResult.file.name)
      waitCount++
    }

    if (file.state === FileState.FAILED) {
      throw new Error('Video processing failed')
    }

    if (file.state === FileState.PROCESSING) {
      throw new Error('Video processing timed out')
    }

    // 4. 分析実行
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const analysisPrompt = prompt || getDefaultAnalysisPrompt()

    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          { fileData: { mimeType: file.mimeType!, fileUri: file.uri } },
          { text: analysisPrompt },
        ],
      }],
    })

    return result.response.text()
  } finally {
    // 5. クリーンアップ
    await unlink(filePath).catch(() => {})
  }
}

/**
 * デフォルトの分析プロンプト
 */
function getDefaultAnalysisPrompt(): string {
  return `この動画を詳細に分析してください。

### 出力形式

## 動画概要
（1-2文で動画の内容を要約）

## ナレーション
（音声の内容を要約）

## カット分析
- カット数: 約○カット
- 平均カット時間: 約○秒

## タイムライン
| 時間 | 内容 | ポイント |
|------|------|----------|
| 0:00-0:02 | フック | 最初の2秒で何をしているか |
| 0:02-0:07 | 興味付け | どう展開しているか |
| ... | ... | ... |

## バズ要因スコア
| 指標 | スコア | 理由 |
|------|--------|------|
| フック力 | /5 | 冒頭で視聴者を引きつける要素 |
| 稀有度 | /5 | 珍しさ、新規性 |
| 情報密度 | /5 | 学びや価値の量 |
| エンタメ性 | /5 | 面白さ、楽しさ |
| CTA力 | /5 | アクション誘導の強さ |

## 改善提案
- （3-5個の具体的な改善点）`
}

/**
 * 単一動画の詳細分析プロンプト
 */
export function getSingleVideoPrompt(): string {
  return `この動画を詳細に分析してください。

### 動画内容
**ナレーション**: （音声を1-2文で要約）
**カット**: 約○カット、平均○秒/カット

### タイムライン
| 時間 | 内容 | ポイント |
|------|------|----------|
| 0:00-0:02 | フック | （最初の2秒） |
| 0:02-0:07 | 興味付け | （展開） |
| 0:07-末尾 | 本編 | （メイン） |
| ラスト | CTA | （コメント誘導） |

### バズ要因
| 指標 | スコア | 理由 |
|------|--------|------|
| フック力 | /5 | |
| 稀有度 | /5 | |
| 情報密度 | /5 | |
| エンタメ性 | /5 | |
| CTA力 | /5 | |

### 改善提案
（具体的な改善点を3-5個）`
}

/**
 * プロフィール分析プロンプト
 */
export function getProfileAnalysisPrompt(videoCount: number, totalViews: number, lvr: number, cvr: number): string {
  return `## エグゼクティブサマリー
（3-5行の全体評価）

## 定量分析
- 動画数: ${videoCount}
- 総再生数: ${totalViews.toLocaleString()}
- 平均再生数: ${Math.round(totalViews / videoCount).toLocaleString()}
- LVR（いいね率）: ${lvr.toFixed(2)}%
- CVR（コメント率）: ${cvr.toFixed(3)}%

## 定性分析
- コンテンツ構成
- ブランディング
- 競合比較

## 改善提案
- 🔴 最優先
- 🟡 中期
- 🟢 長期`
}

/**
 * 分析結果をパース（簡易版）
 */
export function parseAnalysisResult(rawText: string): Partial<VideoAnalysisResult> {
  const result: Partial<VideoAnalysisResult> = {
    rawAnalysis: rawText,
  }

  // サマリーを抽出
  const summaryMatch = rawText.match(/## 動画概要\n([^\n]+)/)
  if (summaryMatch) {
    result.summary = summaryMatch[1].trim()
  }

  // ナレーションを抽出
  const narrationMatch = rawText.match(/## ナレーション\n([^\n]+)/)
  if (narrationMatch) {
    result.narration = narrationMatch[1].trim()
  }

  // カット数を抽出
  const cutMatch = rawText.match(/カット数[：:]\s*約?(\d+)/)
  if (cutMatch) {
    result.cutCount = parseInt(cutMatch[1])
  }

  // 改善提案を抽出
  const improvementsMatch = rawText.match(/## 改善提案\n([\s\S]*?)(?=##|$)/)
  if (improvementsMatch) {
    const improvements = improvementsMatch[1]
      .split('\n')
      .filter(line => line.trim().startsWith('-'))
      .map(line => line.replace(/^-\s*/, '').trim())
    result.improvements = improvements
  }

  return result
}

/**
 * URLから動画をダウンロードして分析
 */
export async function analyzeVideoFromUrl(
  videoUrl: string,
  prompt?: string
): Promise<string> {
  // 動画をダウンロード
  const response = await fetch(videoUrl)
  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.status}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // MIMEタイプを推測
  const contentType = response.headers.get('content-type') || 'video/mp4'

  return analyzeVideoWithGemini(buffer, prompt, contentType)
}
