import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { addVariantJob } from '@/lib/queue/client'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface VariantJobRequest {
  videoId: string // 元動画のID
  preset: 'tiktok_ab' | 'multi_platform' | 'full_test' | 'custom'
  // カスタムバリアント設定
  customVariants?: Array<{
    name: string
    ugcEffects?: {
      effects: string[]
      intensity: 'light' | 'medium' | 'heavy'
    }
    subtitles?: {
      entries: Array<{
        startTime: number
        endTime: number
        text: string
      }>
    }
    platform?: 'tiktok' | 'instagram_reels' | 'youtube_shorts' | 'twitter'
  }>
  // 字幕テスト用
  subtitleTexts?: string[]
}

export async function POST(request: NextRequest) {
  try {
    const body: VariantJobRequest = await request.json()
    const { videoId, preset, customVariants, subtitleTexts } = body

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      )
    }

    // 元動画を取得
    const { data: video, error: fetchError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single()

    if (fetchError || !video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      )
    }

    if (!video.remote_url) {
      return NextResponse.json(
        { error: 'Video has no remote URL to process' },
        { status: 400 }
      )
    }

    // バリアント数を決定
    let variantCount = 4 // デフォルト
    switch (preset) {
      case 'tiktok_ab':
        variantCount = 4
        break
      case 'multi_platform':
        variantCount = 4
        break
      case 'full_test':
        variantCount = subtitleTexts ? 5 : 3
        break
      case 'custom':
        variantCount = customVariants?.length || 0
        break
    }

    if (variantCount === 0) {
      return NextResponse.json(
        { error: 'No variants specified' },
        { status: 400 }
      )
    }

    // バリアント用の動画レコードを作成
    const variantRecords = []
    for (let i = 0; i < variantCount; i++) {
      const variantName = customVariants?.[i]?.name || `variant_${i + 1}`
      variantRecords.push({
        user_id: video.user_id,
        product_id: video.product_id,
        template_id: video.template_id,
        title: `${video.title} - ${variantName}`,
        status: 'processing',
        progress: 0,
        progress_message: 'バリアント生成待機中...',
        metadata: {
          sourceVideoId: videoId,
          variantName,
          variantIndex: i,
          preset,
        },
      })
    }

    const { data: createdVariants, error: insertError } = await supabase
      .from('videos')
      .insert(variantRecords as never)
      .select()

    if (insertError) {
      throw new Error(`Failed to create variant records: ${insertError.message}`)
    }

    const variantIds = (createdVariants as Array<{ id: string }>).map(v => v.id)

    // ジョブをキューに追加
    const job = await addVariantJob({
      sourceVideoId: videoId,
      sourceUrl: video.remote_url,
      variantIds,
      userId: video.user_id,
      preset,
      customVariants,
      subtitleTexts,
      duration: video.duration_seconds || video.duration || 10,
    })

    return NextResponse.json({
      success: true,
      jobId: job.id,
      sourceVideoId: videoId,
      variantIds,
      variantCount,
      message: `${variantCount} variants queued for generation`,
    })
  } catch (error) {
    console.error('Variant API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start variant generation' },
      { status: 500 }
    )
  }
}

// バリアント一覧を取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sourceVideoId = searchParams.get('sourceVideoId')

    if (!sourceVideoId) {
      return NextResponse.json(
        { error: 'sourceVideoId is required' },
        { status: 400 }
      )
    }

    const { data: variants, error } = await supabase
      .from('videos')
      .select('*')
      .contains('metadata', { sourceVideoId })
      .order('created_at', { ascending: true })

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      sourceVideoId,
      variants: variants || [],
      count: variants?.length || 0,
    })
  } catch (error) {
    console.error('Variant GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch variants' },
      { status: 500 }
    )
  }
}
