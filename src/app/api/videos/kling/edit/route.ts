import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { addKlingJob } from '@/lib/queue/client'
import { z } from 'zod'

/**
 * Kling Video-to-Video Edit API
 * 自然言語で既存動画を編集
 * 例: 「背景を夕焼けに変更」「照明を暖かくする」
 */

const editSchema = z.object({
  // 元動画情報
  sourceVideoId: z.string().uuid(),        // DB上の動画ID
  originTaskId: z.string(),                 // Klingタスク ID
  title: z.string().min(1).max(255),
  productId: z.string().uuid(),
  // Edit options
  editPrompt: z.string().min(1).max(2500), // 編集指示（自然言語）
  strength: z.number().min(0).max(1).default(0.5),
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
    const validationResult = editSchema.safeParse(body)

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
      editPrompt,
      strength,
    } = validationResult.data

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
      mode: 'video-edit',
      originTaskId,
      originVideoId: sourceVideoId,
      editPrompt,
      editStrength: strength,
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
      console.error('[Kling Edit] DB Error:', videoError)
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
      mode: 'video-edit',
      prompt: editPrompt,
      duration: ((sourceVideo as { duration_seconds?: number }).duration_seconds || 5) as 5 | 10,
      originTaskId,
      editPrompt,
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
      message: '動画編集を開始しました。完了まで1〜3分かかります。',
    })
  } catch (error) {
    console.error('[Kling Edit] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET: 編集例を返す
export async function GET() {
  return NextResponse.json({
    examples: [
      { prompt: '背景を夕焼けに変更', description: '背景を夕焼けのビーチに変える' },
      { prompt: '照明を暖かくする', description: '全体的に暖かみのあるライティングに' },
      { prompt: 'スローモーションにする', description: '動きをゆっくりに' },
      { prompt: '色をより鮮やかに', description: '彩度を上げて鮮やかに' },
      { prompt: 'フィルムグレインを追加', description: 'ビンテージ感のある粒子を追加' },
    ],
  })
}
