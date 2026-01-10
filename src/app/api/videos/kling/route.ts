import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { addKlingJob } from '@/lib/queue/client'
import { z } from 'zod'

const klingGenerateSchema = z.object({
  productId: z.string().uuid(),
  mode: z.enum(['image-to-video', 'text-to-video']),
  imageUrl: z.string().url().optional(),
  prompt: z.string().min(1).max(1000),
  negativePrompt: z.string().max(500).optional(),
  duration: z.enum(['5', '10']).transform(v => parseInt(v) as 5 | 10),
  presetId: z.string().optional(),
  title: z.string().min(1).max(255),
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

    // リクエストボディ解析
    const body = await request.json()
    const validationResult = klingGenerateSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const {
      productId,
      mode,
      imageUrl,
      prompt,
      negativePrompt,
      duration,
      presetId,
      title,
    } = validationResult.data

    // Image-to-Videoモードの場合、imageUrlは必須
    if (mode === 'image-to-video' && !imageUrl) {
      return NextResponse.json(
        { error: 'imageUrl is required for image-to-video mode' },
        { status: 400 }
      )
    }

    // 商品存在チェック
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, images')
      .eq('id', productId)
      .eq('user_id', user.id)
      .single()

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
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
      } as never)
      .select()
      .single()

    if (videoError || !videoData) {
      console.error('Failed to create video record:', videoError)
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
      mode,
      imageUrl: imageUrl || (product as { images: string[] }).images?.[0],
      prompt,
      negativePrompt,
      duration,
      presetId,
    })

    return NextResponse.json({
      success: true,
      video: {
        id: video.id,
        title: video.title,
        status: video.status,
      },
      jobId: job.id,
      message: 'AI動画生成を開始しました。完了まで1〜3分かかります。',
    })
  } catch (error) {
    console.error('Kling generation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
