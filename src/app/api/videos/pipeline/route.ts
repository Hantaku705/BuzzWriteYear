import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { addPipelineJob } from '@/lib/queue/client'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface PipelineJobRequest {
  videoId: string // 既存の動画ID（remote_urlを持つ）
  preset?: 'tiktok_ugc' | 'review' | 'simple' | 'custom'
  // カスタム設定（preset=customの場合）
  config?: {
    ugcEffects?: {
      enabled: boolean
      effects: string[]
      intensity?: 'light' | 'medium' | 'heavy'
    }
    trim?: {
      enabled: boolean
      startTime: number
      endTime?: number
    }
    subtitles?: {
      enabled: boolean
      entries: Array<{
        startTime: number
        endTime: number
        text: string
      }>
    }
    optimize?: {
      enabled: boolean
      platform: 'tiktok' | 'instagram_reels' | 'youtube_shorts' | 'twitter'
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: PipelineJobRequest = await request.json()
    const { videoId, preset = 'simple', config } = body

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      )
    }

    // 動画データを取得
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

    // ステータスを更新
    await supabase
      .from('videos')
      .update({
        status: 'processing',
        progress: 0,
        progress_message: 'パイプライン処理をキューに追加中...',
      })
      .eq('id', videoId)

    // パイプラインジョブをキューに追加
    const job = await addPipelineJob({
      videoId,
      sourceUrl: video.remote_url,
      preset,
      config,
      userId: video.user_id,
    })

    return NextResponse.json({
      success: true,
      jobId: job.id,
      videoId,
      message: 'Pipeline job queued successfully',
    })
  } catch (error) {
    console.error('Pipeline API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start pipeline' },
      { status: 500 }
    )
  }
}
