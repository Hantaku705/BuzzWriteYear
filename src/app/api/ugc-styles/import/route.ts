/**
 * UGCスタイル インポート API
 * POST: JSONファイルからスタイルをインポート
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { UGCStyleExportJSON } from '@/types/ugc-style'

// インポートデータバリデーション
const importSchema = z.object({
  version: z.literal('1.0'),
  name: z.string().min(1).max(255),
  description: z.string().nullable(),
  createdAt: z.string(),
  sampleCount: z.number(),
  styleProfile: z.object({
    cameraWork: z.object({
      dominantStyle: z.string(),
      shakeIntensity: z.number(),
      zoomUsage: z.number(),
      panUsage: z.number(),
      commonMovements: z.array(z.string()),
    }),
    editStyle: z.object({
      pacing: z.string(),
      avgClipDuration: z.number(),
      transitionTypes: z.array(z.string()),
      hasJumpCuts: z.boolean(),
      beatSync: z.boolean(),
    }),
    visualStyle: z.object({
      colorTone: z.string(),
      filterLook: z.string(),
      contrast: z.string(),
      saturation: z.string(),
      dominantColors: z.array(z.string()),
    }),
    motionStyle: z.object({
      intensity: z.string(),
      subjectMovement: z.string(),
      cameraMovement: z.string(),
    }),
    audioStyle: z.object({
      hasBGM: z.boolean(),
      hasVoiceover: z.boolean(),
      musicGenre: z.string(),
      sfxUsage: z.string(),
    }),
  }),
  generationParams: z.object({
    klingPromptSuffix: z.string(),
    klingNegativePrompt: z.string(),
    motionPresetId: z.string().optional(),
    cameraPresetId: z.string().optional(),
    ffmpegEffects: z.object({
      effects: z.array(z.string()),
      intensity: z.string(),
    }),
  }),
  keywords: z.array(z.string()),
  overallVibe: z.string(),
})

/**
 * POST /api/ugc-styles/import
 * JSONファイルからスタイルをインポート
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // ユーザー認証確認
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // リクエストボディをパース
    const body = await request.json()

    // バリデーション
    const validation = importSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: `無効なJSONフォーマット: ${validation.error.issues[0].message}` },
        { status: 400 }
      )
    }

    const importData = validation.data as UGCStyleExportJSON

    // 同名のスタイルがあるか確認
    const { data: existing } = await supabase
      .from('ugc_styles')
      .select('id, name')
      .eq('user_id', user.id)
      .eq('name', importData.name)
      .single()

    // 同名がある場合は名前を変更
    let finalName = importData.name
    if (existing) {
      const timestamp = new Date().toISOString().slice(0, 10)
      finalName = `${importData.name} (${timestamp})`
    }

    // スタイルを作成
    const { data: style, error: styleError } = await supabase
      .from('ugc_styles')
      .insert({
        user_id: user.id,
        name: finalName,
        description: importData.description,
        status: 'ready', // インポート済みは即座にready
        sample_count: importData.sampleCount,
        style_profile: importData.styleProfile,
        generation_params: importData.generationParams,
        keywords: importData.keywords,
        overall_vibe: importData.overallVibe,
      } as never)
      .select('id, name, status')
      .single()

    if (styleError || !style) {
      throw new Error(styleError?.message || 'スタイルの作成に失敗しました')
    }

    return NextResponse.json({
      success: true,
      id: (style as { id: string }).id,
      name: (style as { name: string }).name,
      message: existing
        ? `同名のスタイルが存在したため「${finalName}」として作成しました`
        : undefined,
    })
  } catch (error) {
    console.error('Failed to import UGC style:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'インポートに失敗しました' },
      { status: 500 }
    )
  }
}
