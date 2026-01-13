/**
 * SNS動画分析 API
 * POST: URLから動画を分析
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  analyzeVideoByUrl,
  analyzeProfileByUrl,
  detectPlatform,
  isTikTokProfileUrl,
  isInstagramProfileUrl,
  isYouTubeChannelUrl,
} from '@/lib/sns'

// リクエストバリデーション
const analyzeRequestSchema = z.object({
  url: z.string().url(),
  includeAIAnalysis: z.boolean().optional().default(false),
  aiPrompt: z.string().optional(),
  videoCount: z.number().min(1).max(100).optional().default(30),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url, includeAIAnalysis, aiPrompt, videoCount } = analyzeRequestSchema.parse(body)

    // プラットフォーム判定
    const platform = detectPlatform(url)
    if (!platform) {
      return NextResponse.json(
        { error: '対応していないURLです。TikTok, Instagram, YouTube のURLを入力してください。' },
        { status: 400 }
      )
    }

    // プロフィールURLかどうか判定
    const isProfile =
      isTikTokProfileUrl(url) ||
      isInstagramProfileUrl(url) ||
      isYouTubeChannelUrl(url)

    if (isProfile) {
      // プロフィール分析
      const result = await analyzeProfileByUrl(url, { videoCount })
      return NextResponse.json({
        type: 'profile',
        ...result,
      })
    } else {
      // 単一動画分析
      const result = await analyzeVideoByUrl(url, {
        includeAIAnalysis,
        aiPrompt,
      })
      return NextResponse.json({
        type: 'video',
        ...result,
      })
    }
  } catch (error) {
    console.error('SNS analyze error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'リクエストが不正です', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : '分析に失敗しました' },
      { status: 500 }
    )
  }
}
