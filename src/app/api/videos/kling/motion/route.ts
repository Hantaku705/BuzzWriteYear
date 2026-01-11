import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { addKlingJob } from '@/lib/queue/client'
import { cropToAspectRatio, getImageMetadata } from '@/lib/image'
import { z } from 'zod'
import { MOTION_PRESETS } from '@/lib/video/kling/motion-presets'

/**
 * Kling Motion Reference API
 * モーションプリセットまたは参照動画を使用してモーションを適用
 */

// アスペクト比に合わせて画像をクロップしてアップロード
async function fetchCropAndUpload(
  imageUrl: string,
  targetAspectRatio: '9:16' | '16:9' | '1:1',
  supabase: ReturnType<typeof import('@/lib/supabase/server').createClient> extends Promise<infer T> ? T : never,
  userId: string
): Promise<string> {
  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`)
  }
  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const metadata = await getImageMetadata(buffer)
  const srcRatio = metadata.width / metadata.height

  let targetRatio: number
  switch (targetAspectRatio) {
    case '9:16':
      targetRatio = 9 / 16
      break
    case '16:9':
      targetRatio = 16 / 9
      break
    case '1:1':
    default:
      targetRatio = 1
      break
  }

  const ratioDiff = Math.abs(srcRatio - targetRatio) / targetRatio
  if (ratioDiff < 0.05) {
    return imageUrl
  }

  const cropped = await cropToAspectRatio(buffer, targetAspectRatio, {
    maxSize: 1920,
    quality: 90,
    format: 'jpeg',
  })

  const fileName = `kling-input/${userId}/${Date.now()}-motion-${targetAspectRatio.replace(':', 'x')}.jpg`
  const { error: uploadError } = await supabase.storage
    .from('videos')
    .upload(fileName, cropped.buffer, {
      contentType: 'image/jpeg',
      upsert: true,
    })

  if (uploadError) {
    throw new Error(`Failed to upload cropped image: ${uploadError.message}`)
  }

  const { data: { publicUrl } } = supabase.storage
    .from('videos')
    .getPublicUrl(fileName)

  return publicUrl
}

const motionPresetIds = MOTION_PRESETS.map(p => p.id) as [string, ...string[]]

const motionSchema = z.object({
  productId: z.string().uuid(),
  title: z.string().min(1).max(255),
  imageUrl: z.string().url(),
  prompt: z.string().min(1).max(2500),
  negativePrompt: z.string().max(2500).optional(),
  // Motion options
  motionPresetId: z.enum(motionPresetIds).optional(),
  motionVideoUrl: z.string().url().optional(),
  motionStrength: z.number().min(0).max(1).default(0.7),
  // Standard params
  duration: z.enum(['5', '10']).transform(v => parseInt(v) as 5 | 10),
  aspectRatio: z.enum(['16:9', '9:16', '1:1']).default('9:16'),
  quality: z.enum(['standard', 'pro']).default('standard'),
  modelVersion: z.enum(['1.5', '1.6', '2.1', '2.1-master', '2.5', '2.6']).default('2.6'),
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
    const validationResult = motionSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const {
      productId,
      title,
      imageUrl,
      prompt,
      negativePrompt,
      motionPresetId,
      motionVideoUrl,
      motionStrength,
      duration,
      aspectRatio,
      quality,
      modelVersion,
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

    // 画像をアスペクト比に合わせてクロップ
    let processedImageUrl = imageUrl
    try {
      processedImageUrl = await fetchCropAndUpload(imageUrl, aspectRatio, supabase, user.id)
    } catch (cropError) {
      console.error('[Kling Motion] Image crop error:', cropError)
      return NextResponse.json(
        { error: 'Failed to crop image', details: String(cropError) },
        { status: 500 }
      )
    }

    // generation_config
    const generationConfig = {
      modelVersion,
      aspectRatio,
      quality,
      mode: 'motion-ref',
      motionPresetId,
      motionVideoUrl,
      motionStrength,
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
      console.error('[Kling Motion] DB Error:', videoError)
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
      mode: 'motion-ref',
      imageUrl: processedImageUrl,
      prompt,
      negativePrompt,
      duration,
      modelVersion,
      aspectRatio,
      quality,
      motionPresetId,
      motionVideoUrl,
      motionStrength,
    })

    return NextResponse.json({
      success: true,
      video: {
        id: video.id,
        title: video.title,
        status: video.status,
      },
      jobId: job.id,
      message: 'モーション参照動画生成を開始しました。完了まで1〜3分かかります。',
    })
  } catch (error) {
    console.error('[Kling Motion] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET: モーションプリセット一覧を返す
export async function GET() {
  return NextResponse.json({
    presets: MOTION_PRESETS.map(p => ({
      id: p.id,
      name: p.name,
      nameJa: p.nameJa,
      description: p.description,
      descriptionJa: p.descriptionJa,
      category: p.category,
    })),
  })
}
