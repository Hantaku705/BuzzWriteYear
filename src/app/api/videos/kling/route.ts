import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { addKlingJob } from '@/lib/queue/client'
import { cropToAspectRatio, getImageMetadata } from '@/lib/image'
import { z } from 'zod'

// 画像をURLから取得してクロップし、Supabase Storageにアップロード
async function fetchCropAndUpload(
  imageUrl: string,
  targetAspectRatio: '9:16' | '16:9' | '1:1',
  supabase: ReturnType<typeof import('@/lib/supabase/server').createClient> extends Promise<infer T> ? T : never,
  userId: string
): Promise<string> {
  // 画像をフェッチ
  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`)
  }
  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // メタデータ取得
  const metadata = await getImageMetadata(buffer)
  const srcRatio = metadata.width / metadata.height

  // 目標アスペクト比を計算
  let targetRatio: number
  switch (targetAspectRatio) {
    case '9:16':
      targetRatio = 9 / 16  // 0.5625 (縦長)
      break
    case '16:9':
      targetRatio = 16 / 9  // 1.777 (横長)
      break
    case '1:1':
    default:
      targetRatio = 1
      break
  }

  console.log(`[Kling Crop] Source: ${metadata.width}x${metadata.height} (ratio: ${srcRatio.toFixed(3)})`)
  console.log(`[Kling Crop] Target: ${targetAspectRatio} (ratio: ${targetRatio.toFixed(3)})`)

  // アスペクト比が近い場合（±5%）はクロップ不要
  const ratioDiff = Math.abs(srcRatio - targetRatio) / targetRatio
  const ratioTolerance = 0.05
  if (ratioDiff < ratioTolerance) {
    console.log(`[Kling Crop] Ratio difference ${(ratioDiff * 100).toFixed(1)}% < 5% tolerance, skipping crop`)
    return imageUrl // 元のURLをそのまま返す
  }

  console.log(`[Kling Crop] Ratio difference ${(ratioDiff * 100).toFixed(1)}% > 5% tolerance, cropping required`)

  // クロップ実行
  const cropped = await cropToAspectRatio(buffer, targetAspectRatio, {
    maxSize: 1920, // Kling推奨: 最低300px、最大10MB
    quality: 90,
    format: 'jpeg', // PiAPIはJPEGを推奨
  })

  console.log(`[Kling Crop] Cropped to: ${cropped.width}x${cropped.height} (${(cropped.size / 1024).toFixed(1)}KB)`)

  // Supabase Storageにアップロード
  const fileName = `kling-input/${userId}/${Date.now()}-${targetAspectRatio.replace(':', 'x')}.jpg`
  const { error: uploadError } = await supabase.storage
    .from('videos')
    .upload(fileName, cropped.buffer, {
      contentType: 'image/jpeg',
      upsert: true,
    })

  if (uploadError) {
    throw new Error(`Failed to upload cropped image: ${uploadError.message}`)
  }

  // 公開URLを取得
  const { data: { publicUrl } } = supabase.storage
    .from('videos')
    .getPublicUrl(fileName)

  return publicUrl
}

const klingGenerateSchema = z.object({
  productId: z.string().uuid().optional(), // Now optional for standalone generation
  mode: z.enum(['image-to-video', 'text-to-video']),
  imageUrl: z.string().url().optional(),
  imageTailUrl: z.string().url().optional(),  // O1デュアルキーフレーム
  prompt: z.string().min(1).max(2500),        // PiAPIは2500文字まで対応
  negativePrompt: z.string().max(2500).optional(),
  duration: z.enum(['5', '10']).transform(v => parseInt(v) as 5 | 10),
  presetId: z.string().optional(),
  title: z.string().min(1).max(255),
  // O1新パラメータ
  modelVersion: z.enum(['1.5', '1.6', '2.1', '2.1-master', '2.5', '2.6']).default('1.6'),
  aspectRatio: z.enum(['16:9', '9:16', '1:1']).default('9:16'),
  quality: z.enum(['standard', 'pro']).default('standard'),
  cfgScale: z.number().min(0).max(1).optional(),
  enableAudio: z.boolean().optional(),
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
      imageTailUrl,
      prompt,
      negativePrompt,
      duration,
      presetId,
      title,
      modelVersion,
      aspectRatio,
      quality,
      cfgScale,
      enableAudio,
    } = validationResult.data

    // バリデーション: 2.1-masterはPro専用
    if (modelVersion === '2.1-master' && quality !== 'pro') {
      return NextResponse.json(
        { error: 'Kling 2.1 Master requires Professional mode' },
        { status: 400 }
      )
    }

    // バリデーション: 音声生成は2.6のみ
    if (enableAudio && modelVersion !== '2.6') {
      return NextResponse.json(
        { error: 'Audio generation is only available with Kling 2.6' },
        { status: 400 }
      )
    }

    // Image-to-Videoモードの場合、imageUrlは必須
    if (mode === 'image-to-video' && !imageUrl) {
      return NextResponse.json(
        { error: 'imageUrl is required for image-to-video mode' },
        { status: 400 }
      )
    }

    // Image-to-Video: アスペクト比に合わせて画像をクロップ
    // 重要: PiAPI I2Vモードではaspect_ratioパラメータが無視され、
    // 入力画像のアスペクト比がそのまま出力動画に使用されるため、
    // 事前にクロップが必須
    let processedImageUrl = imageUrl
    let processedTailUrl = imageTailUrl
    if (mode === 'image-to-video' && imageUrl) {
      try {
        console.log(`[Kling] Cropping image to ${aspectRatio}...`)
        console.log(`[Kling] Original image URL: ${imageUrl}`)
        processedImageUrl = await fetchCropAndUpload(imageUrl, aspectRatio, supabase, user.id)
        console.log(`[Kling] Image cropped to ${aspectRatio}: ${processedImageUrl}`)

        // 終了フレームもクロップ
        if (imageTailUrl) {
          processedTailUrl = await fetchCropAndUpload(imageTailUrl, aspectRatio, supabase, user.id)
          console.log(`[Kling] Tail image cropped to ${aspectRatio}: ${processedTailUrl}`)
        }
      } catch (cropError) {
        console.error('[Kling] Image crop error:', cropError)
        // I2Vモードではクロップ必須 - エラー時は処理を中断
        return NextResponse.json(
          { error: 'Failed to crop image to target aspect ratio', details: String(cropError) },
          { status: 500 }
        )
      }
    }

    // 商品存在チェック（productIdが指定されている場合のみ）
    let product: { id: string; name: string; images: string[] } | null = null
    if (productId) {
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('id, name, images')
        .eq('id', productId)
        .eq('user_id', user.id)
        .single()

      if (productError || !productData) {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        )
      }
      product = productData as { id: string; name: string; images: string[] }
    }

    // generation_config を作成
    const generationConfig = {
      modelVersion,
      aspectRatio,
      quality,
      cfgScale,
      enableAudio: enableAudio || false,
      hasEndKeyframe: !!imageTailUrl,
    }

    // ビデオレコード作成
    const { data: videoData, error: videoError } = await supabase
      .from('videos')
      .insert({
        user_id: user.id,
        product_id: productId || null, // Allow null for standalone generation
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
      console.error('Failed to create video record:', videoError)
      return NextResponse.json(
        { error: 'Failed to create video record' },
        { status: 500 }
      )
    }

    const video = videoData as { id: string; title: string; status: string }

    // キューにジョブ追加（クロップ済みのURLを使用）
    // Image-to-VideoモードではprocessedImageUrlが必須
    const finalImageUrl = processedImageUrl || product?.images?.[0]
    if (mode === 'image-to-video' && !finalImageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required for image-to-video mode' },
        { status: 400 }
      )
    }

    const job = await addKlingJob({
      videoId: video.id,
      userId: user.id,
      ...(productId && { productId }),
      mode,
      imageUrl: finalImageUrl,
      imageTailUrl: processedTailUrl,
      prompt,
      negativePrompt,
      duration,
      presetId,
      // O1新パラメータ
      modelVersion,
      aspectRatio,
      quality,
      cfgScale,
      enableAudio,
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
