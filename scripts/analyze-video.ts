/**
 * Gemini 2.0 Video Analysis Script
 * 動画ファイルをGemini APIで分析
 */

import fs from 'fs'
import path from 'path'

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent'

async function analyzeVideo(videoPath: string, prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set')
  }

  // 動画ファイルを読み込み
  const absolutePath = path.resolve(videoPath)
  console.log(`Reading video: ${absolutePath}`)

  const videoBuffer = fs.readFileSync(absolutePath)
  const base64Video = videoBuffer.toString('base64')
  const fileSizeMB = (videoBuffer.length / 1024 / 1024).toFixed(2)

  console.log(`Video size: ${fileSizeMB} MB`)
  console.log('Sending to Gemini API...\n')

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          {
            inline_data: {
              mime_type: 'video/mp4',
              data: base64Video
            }
          },
          { text: prompt }
        ]
      }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 4096,
      }
    })
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`Gemini API error: ${response.status} - ${JSON.stringify(errorData)}`)
  }

  const result = await response.json()

  if (result.candidates && result.candidates[0]?.content?.parts?.[0]?.text) {
    return result.candidates[0].content.parts[0].text
  }

  throw new Error(`Unexpected response: ${JSON.stringify(result)}`)
}

// Main
const videoPath = process.argv[2]
const customPrompt = process.argv[3]

if (!videoPath) {
  console.error('Usage: npx tsx scripts/analyze-video.ts <video_path> [prompt]')
  process.exit(1)
}

const defaultPrompt = `この動画の内容を詳しく分析してください。

1. 動画の概要（何についての動画か）
2. 紹介されている機能やサービス
3. デモンストレーションの内容
4. 重要なポイントや特徴

日本語で回答してください。`

analyzeVideo(videoPath, customPrompt || defaultPrompt)
  .then(result => {
    console.log('=== 分析結果 ===\n')
    console.log(result)
  })
  .catch(error => {
    console.error('Error:', error.message)
    process.exit(1)
  })
