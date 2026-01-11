import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { addKlingJob } from '@/lib/queue/client'
import { z } from 'zod'

/**
 * Kling Inpaint API
 * 動画から指定オブジェクトを削除
 * 例: 「背景の人物を削除」「ロゴを消す」
 */

const inpaintSchema = z.object({
  // 元動画情報
  sourceVideoId: z.string().uuid(),        // DB上の動画ID
  originTaskId: z.string(),                 // Klingタスク ID
  title: z.string().min(1).max(255),
  productId: z.string().uuid(),
  // Inpaint options
  removePrompt: z.string().min(1).max(2500), // 削除対象（自然言語）
  maskImageUrl: z.string().url().optional(),  // マスク画像（将来用）
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
    const validationResult = inpaintSchema.safeParse(body)

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
      removePrompt,
      maskImageUrl,
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
      mode: 'inpaint',
      originTaskId,
      originVideoId: sourceVideoId,
      removePrompt,
      maskImageUrl,
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
      console.error('[Kling Inpaint] DB Error:', videoError)
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
      mode: 'inpaint',
      prompt: removePrompt,
      duration: ((sourceVideo as { duration_seconds?: number }).duration_seconds || 5) as 5 | 10,
      originTaskId,
      removePrompt,
    })

    return NextResponse.json({
      success: true,
      video: {
        id: video.id,
        title: video.title,
        status: video.status,
      },
      jobId: job.id,
      message: 'オブジェクト削除を開始しました。完了まで1〜3分かかります。',
    })
  } catch (error) {
    console.error('[Kling Inpaint] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET: 削除例を返す
export async function GET() {
  return NextResponse.json({
    examples: [
      { prompt: '背景の人物を削除', description: '背景に写り込んだ人を消す' },
      { prompt: 'ロゴを消す', description: '動画内のロゴマークを削除' },
      { prompt: '影を削除', description: '不自然な影を消す' },
      { prompt: 'テキストを削除', description: '動画内の文字を消す' },
      { prompt: '反射を削除', description: '不要な反射や映り込みを消す' },
    ],
  })
}
