import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { addVideoGenerationJob } from '@/lib/queue/client'
import { z } from 'zod'

// inputPropsの許可リスト方式スキーマ（任意データを制限）
const inputPropsSchema = z.object({
  productName: z.string().max(200).optional(),
  price: z.union([z.number(), z.string()]).optional(),
  features: z.array(z.string().max(500)).max(20).optional(),
  beforeImage: z.string().url().optional(),
  afterImage: z.string().url().optional(),
  reviewText: z.string().max(1000).optional(),
  reviewerName: z.string().max(100).optional(),
  rating: z.number().min(1).max(5).optional(),
  backgroundColor: z.string().max(20).optional(),
  textColor: z.string().max(20).optional(),
  productImage: z.string().url().optional(),
}).passthrough() // 追加フィールドは許可するが基本は検証済み

const generateVideoSchema = z.object({
  productId: z.string().uuid(),
  templateId: z.string().uuid(),
  compositionId: z.enum(['ProductIntro', 'BeforeAfter', 'ReviewText', 'FeatureList']),
  inputProps: inputPropsSchema,
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
    const validationResult = generateVideoSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { productId, templateId, compositionId, inputProps, title } = validationResult.data

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

    // テンプレート存在チェック
    const { data: templateData, error: templateError } = await supabase
      .from('templates')
      .select('id, type, content_type, usage_count')
      .eq('id', templateId)
      .single()

    if (templateError || !templateData) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    const template = templateData as {
      id: string
      type: string
      content_type: string
      usage_count: number
    }

    // ビデオレコード作成
    const { data: videoData, error: videoError } = await supabase
      .from('videos')
      .insert({
        user_id: user.id,
        product_id: productId,
        template_id: templateId,
        title,
        content_type: template.content_type,
        generation_method: template.type,
        status: 'generating',
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
    const job = await addVideoGenerationJob({
      videoId: video.id,
      userId: user.id,
      productId,
      templateId,
      compositionId,
      inputProps: inputProps as Record<string, unknown>,
    })

    // テンプレート使用回数を増加
    await supabase
      .from('templates')
      .update({ usage_count: template.usage_count + 1 } as never)
      .eq('id', templateId)

    return NextResponse.json({
      success: true,
      video: {
        id: video.id,
        title: video.title,
        status: video.status,
      },
      jobId: job.id,
    })
  } catch (error) {
    console.error('Video generation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
