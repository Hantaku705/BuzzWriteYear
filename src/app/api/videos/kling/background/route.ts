import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { addKlingJob } from '@/lib/queue/client'
import { z } from 'zod'
import { BACKGROUND_PRESETS } from '@/lib/video/kling/styles'

/**
 * Kling Background Replace API
 * 既存動画の背景を変更
 */

const bgPresetIds = BACKGROUND_PRESETS.map(p => p.id) as [string, ...string[]]

const backgroundSchema = z.object({
  // 元動画情報
  sourceVideoId: z.string().uuid(),        // DB上の動画ID
  originTaskId: z.string(),                 // Klingタスク ID
  title: z.string().min(1).max(255),
  productId: z.string().uuid(),
  // Background options
  backgroundPresetId: z.enum(bgPresetIds).optional(),
  backgroundPrompt: z.string().max(2500).optional(),  // テキスト指定
  backgroundImageUrl: z.string().url().optional(),     // 参照画像
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
    const validationResult = backgroundSchema.safeParse(body)

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
      backgroundPresetId,
      backgroundPrompt,
      backgroundImageUrl,
    } = validationResult.data

    // バリデーション: いずれかが必要
    if (!backgroundPresetId && !backgroundPrompt && !backgroundImageUrl) {
      return NextResponse.json(
        { error: 'Either backgroundPresetId, backgroundPrompt, or backgroundImageUrl is required' },
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
      mode: 'background',
      originTaskId,
      originVideoId: sourceVideoId,
      backgroundPresetId,
      backgroundPrompt,
      backgroundImageUrl,
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
      console.error('[Kling Background] DB Error:', videoError)
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
      mode: 'background',
      prompt: backgroundPrompt || '',
      duration: ((sourceVideo as { duration_seconds?: number }).duration_seconds || 5) as 5 | 10,
      originTaskId,
      backgroundPresetId,
      backgroundPrompt,
      backgroundImageUrl,
    })

    return NextResponse.json({
      success: true,
      video: {
        id: video.id,
        title: video.title,
        status: video.status,
      },
      jobId: job.id,
      message: '背景変更を開始しました。完了まで1〜3分かかります。',
    })
  } catch (error) {
    console.error('[Kling Background] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET: 背景プリセット一覧を返す
export async function GET() {
  return NextResponse.json({
    presets: BACKGROUND_PRESETS.map(p => ({
      id: p.id,
      name: p.name,
      nameJa: p.nameJa,
      description: p.description,
      descriptionJa: p.descriptionJa,
      category: p.category,
    })),
  })
}
