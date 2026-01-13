/**
 * UGCスタイル分析ロジック
 * Gemini 2.0でサンプル動画を分析し、スタイル特性を抽出
 */

import type { SampleAnalysisResult } from '@/types/ugc-style'

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent'

/** サンプル動画分析プロンプト */
const SAMPLE_ANALYSIS_PROMPT = `Analyze this UGC (User Generated Content) video and extract detailed style characteristics for video generation.

Return ONLY a valid JSON object with the following structure (no explanation, just JSON):

{
  "cameraWork": {
    "movements": ["list of camera movements detected: pan_left, pan_right, zoom_in, zoom_out, tilt_up, tilt_down, shake, static, etc."],
    "stability": "stable | handheld | shaky",
    "framing": "closeup | medium | wide | mixed"
  },
  "editStyle": {
    "pacing": "slow | medium | fast",
    "avgClipDuration": 2.5,
    "transitionTypes": ["cut", "fade", "swipe", "zoom", etc.],
    "hasJumpCuts": true or false
  },
  "visualStyle": {
    "dominantColors": ["list of dominant colors as descriptive names or hex codes"],
    "contrast": "low | medium | high",
    "saturation": "muted | natural | vibrant",
    "filterLook": "vintage | modern | raw | cinematic | warm | cool | etc."
  },
  "motionContent": {
    "subjectType": "product | person | both | other",
    "motionIntensity": "subtle | moderate | dynamic",
    "keyActions": ["list of main actions: unboxing, showing, demonstrating, reviewing, etc."]
  },
  "audio": {
    "hasBGM": true or false,
    "hasVoiceover": true or false,
    "musicGenre": "upbeat_pop | chill | electronic | acoustic | none | etc."
  },
  "overallDescription": "A brief description of the overall style and vibe of this video in English"
}

Important:
- Be specific and accurate based on what you observe
- Use the exact property names and value options provided
- Return ONLY the JSON, no markdown code blocks or explanation`

/**
 * 動画URLからBase64データを取得
 */
async function fetchVideoAsBase64(videoUrl: string): Promise<{ base64: string; mimeType: string }> {
  const response = await fetch(videoUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch video: ${response.status}`)
  }

  const contentType = response.headers.get('content-type') || 'video/mp4'
  const arrayBuffer = await response.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')

  return { base64, mimeType: contentType }
}

/**
 * Gemini APIで動画を分析
 */
export async function analyzeVideoWithGemini(
  videoUrl: string,
  apiKey: string
): Promise<SampleAnalysisResult> {
  // 動画をBase64に変換
  const { base64, mimeType } = await fetchVideoAsBase64(videoUrl)

  // Gemini APIリクエスト
  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          {
            inline_data: {
              mime_type: mimeType,
              data: base64
            }
          },
          { text: SAMPLE_ANALYSIS_PROMPT }
        ]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
      }
    })
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`Gemini API error: ${response.status} - ${JSON.stringify(errorData)}`)
  }

  const result = await response.json()

  if (!result.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new Error(`Unexpected Gemini response: ${JSON.stringify(result)}`)
  }

  const text = result.candidates[0].content.parts[0].text

  // JSONをパース（コードブロックがあれば除去）
  let jsonText = text.trim()
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }

  try {
    const parsed = JSON.parse(jsonText) as SampleAnalysisResult
    return validateAndNormalize(parsed)
  } catch (e) {
    throw new Error(`Failed to parse Gemini response as JSON: ${e}. Response: ${text}`)
  }
}

/**
 * 分析結果をバリデート・正規化
 */
function validateAndNormalize(result: unknown): SampleAnalysisResult {
  const r = result as Record<string, unknown>

  // デフォルト値でマージ
  const defaultResult: SampleAnalysisResult = {
    cameraWork: {
      movements: [],
      stability: 'handheld',
      framing: 'mixed'
    },
    editStyle: {
      pacing: 'medium',
      avgClipDuration: 3,
      transitionTypes: ['cut'],
      hasJumpCuts: false
    },
    visualStyle: {
      dominantColors: [],
      contrast: 'medium',
      saturation: 'natural',
      filterLook: 'raw'
    },
    motionContent: {
      subjectType: 'product',
      motionIntensity: 'moderate',
      keyActions: []
    },
    audio: {
      hasBGM: false,
      hasVoiceover: false,
      musicGenre: 'none'
    },
    overallDescription: ''
  }

  // 各フィールドをマージ
  if (r.cameraWork && typeof r.cameraWork === 'object') {
    Object.assign(defaultResult.cameraWork, r.cameraWork)
  }
  if (r.editStyle && typeof r.editStyle === 'object') {
    Object.assign(defaultResult.editStyle, r.editStyle)
  }
  if (r.visualStyle && typeof r.visualStyle === 'object') {
    Object.assign(defaultResult.visualStyle, r.visualStyle)
  }
  if (r.motionContent && typeof r.motionContent === 'object') {
    Object.assign(defaultResult.motionContent, r.motionContent)
  }
  if (r.audio && typeof r.audio === 'object') {
    Object.assign(defaultResult.audio, r.audio)
  }
  if (typeof r.overallDescription === 'string') {
    defaultResult.overallDescription = r.overallDescription
  }

  return defaultResult
}

/**
 * 動画のメタデータを取得（duration等）
 * Note: サーバーサイドでの実装は制限があるため、基本的にはクライアントで取得
 */
export async function getVideoMetadata(videoUrl: string): Promise<{
  durationSeconds: number | null
  fileSizeBytes: number | null
}> {
  try {
    const response = await fetch(videoUrl, { method: 'HEAD' })
    const contentLength = response.headers.get('content-length')

    return {
      durationSeconds: null, // サーバーサイドでは取得困難
      fileSizeBytes: contentLength ? parseInt(contentLength, 10) : null
    }
  } catch {
    return { durationSeconds: null, fileSizeBytes: null }
  }
}
