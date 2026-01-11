import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { addKlingJob } from '@/lib/queue/client'
import { z } from 'zod'

/**
 * Kling Elements API
 * 画像から抽出した要素を動画に追加する
 * 例: 商品画像から商品を抽出し、背景動画に合成
 */

const elementsSchema = z.object({
  productId: z.string().uuid(),
  title: z.string().min(1).max(255),
  prompt: z.string().min(1).max(2500),
  negativePrompt: z.string().max(2500).optional(),
  duration: z.enum(['5', '10']).transform(v => parseInt(v) as 5 | 10),
  aspectRatio: z.enum(['16:9', '9:16', '1:1']).default('9:16'),
  quality: z.enum(['standard', 'pro']).default('standard'),
  // Elements: 1-4枚の画像URL
  elementImages: z.array(z.string().url()).min(1).max(4),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 認証チェック
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
    const validationResult = elementsSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const {
      productId,
      title,
      prompt,
      negativePrompt,
      duration,
      aspectRatio,
      quality,
      elementImages,
    } = validationResult.data

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

    // generation_config を作成
    const generationConfig = {
      modelVersion: '1.6', // Elementsは1.6必須
      aspectRatio,
      quality,
      elements: elementImages,
      isElements: true,
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
        duration_seconds: duration,
        generation_config: generationConfig,
      } as never)
      .select()
      .single()

    if (videoError || !videoData) {
      console.error('[Kling Elements] DB Error:', videoError)
      return NextResponse.json(
        { error: 'Failed to create video record' },
        { status: 500 }
      )
    }

    const video = videoData as { id: string; title: string; status: string }

    // キューにジョブ追加（Elements用）
    const job = await addKlingJob({
      videoId: video.id,
      userId: user.id,
      productId,
      mode: 'elements', // Elements専用モード
      prompt,
      negativePrompt,
      duration,
      modelVersion: '1.6', // Elementsは1.6必須
      aspectRatio,
      quality,
      // Elements固有パラメータ
      elementImages,
    })

    return NextResponse.json({
      success: true,
      video: {
        id: video.id,
        title: video.title,
        status: video.status,
      },
      jobId: job.id,
      message: 'Elements動画生成を開始しました。完了まで1〜3分かかります。',
    })
  } catch (error) {
    console.error('[Kling Elements] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
