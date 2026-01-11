import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { addKlingJob } from '@/lib/queue/client'
import { z } from 'zod'
import { STYLE_PRESETS } from '@/lib/video/kling/styles'

/**
 * Kling Style Transfer API
 * 既存動画にスタイルを適用（アニメ調、油絵風等）
 */

const stylePresetIds = STYLE_PRESETS.map(p => p.id) as [string, ...string[]]

const styleSchema = z.object({
  // 元動画情報
  sourceVideoId: z.string().uuid(),        // DB上の動画ID
  originTaskId: z.string(),                 // Klingタスク ID
  title: z.string().min(1).max(255),
  productId: z.string().uuid(),
  // Style options
  stylePresetId: z.enum(stylePresetIds).optional(),
  styleImageUrl: z.string().url().optional(),  // スタイル参照画像
  customPrompt: z.string().max(2500).optional(), // カスタムスタイルプロンプト
  strength: z.number().min(0).max(1).default(0.7),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validationResult = styleSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const {
      sourceVideoId,
      originTaskId,
      title,
      productId,
      stylePresetId,
      styleImageUrl,
      customPrompt,
      strength,
    } = validationResult.data

    // バリデーション: プリセットかカスタムプロンプトのいずれかが必要
    if (!stylePresetId && !customPrompt && !styleImageUrl) {
      return NextResponse.json(
        { error: 'Either stylePresetId, customPrompt, or styleImageUrl is required' },
        { status: 400 }
      )
    }

    // 元動画の存在確認
    const { data: sourceVideo, error: sourceError } = await supabase
      .from('videos')
      .select('id, title, duration_seconds, generation_config')
      .eq('id', sourceVideoId)
      .eq('user_id', user.id)
      .single()

    if (sourceError || !sourceVideo) {
      return NextResponse.json(
        { error: 'Source video not found' },
        { status: 404 }
      )
    }

    // 商品存在チェック
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name')
      .eq('id', productId)
      .eq('user_id', user.id)
      .single()

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    const sourceConfig = (sourceVideo as { generation_config?: Record<string, unknown> }).generation_config || {}

    // generation_config
    const generationConfig = {
      ...sourceConfig,
      mode: 'style-transfer',
      originTaskId,
      originVideoId: sourceVideoId,
      stylePresetId,
      styleImageUrl,
      customPrompt,
      strength,
    }

    // ビデオレコード作成
    const { data: videoData, error: videoError } = await supabase
      .from('videos')
      .insert({
        user_id: user.id,
        product_id: productId,
        title,
        content_type: 'ai_generated',
        generation_method: 'kling',
        status: 'generating',
        duration_seconds: (sourceVideo as { duration_seconds?: number }).duration_seconds || 5,
        generation_config: generationConfig,
      } as never)
      .select()
      .single()

    if (videoError || !videoData) {
      console.error('[Kling Style] DB Error:', videoError)
      return NextResponse.json(
        { error: 'Failed to create video record' },
        { status: 500 }
      )
    }

    const video = videoData as { id: string; title: string; status: string }

    // キューにジョブ追加
    const job = await addKlingJob({
      videoId: video.id,
      userId: user.id,
      productId,
      mode: 'style-transfer',
      prompt: customPrompt || '',
      duration: ((sourceVideo as { duration_seconds?: number }).duration_seconds || 5) as 5 | 10,
      originTaskId,
      stylePresetId,
      styleImageUrl,
      editStrength: strength,
    })

    return NextResponse.json({
      success: true,
      video: {
        id: video.id,
        title: video.title,
        status: video.status,
      },
      jobId: job.id,
      message: 'スタイル変換を開始しました。完了まで1〜3分かかります。',
    })
  } catch (error) {
    console.error('[Kling Style] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET: スタイルプリセット一覧を返す
export async function GET() {
  return NextResponse.json({
    presets: STYLE_PRESETS.map(p => ({
      id: p.id,
      name: p.name,
      nameJa: p.nameJa,
      description: p.description,
      descriptionJa: p.descriptionJa,
      category: p.category,
    })),
  })
}
