import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const KLING_API_BASE = 'https://api.piapi.ai'

// TTS音声タイプ（PiAPI Kling対応）
const TTS_TIMBRES = [
  'male-young-1', 'male-young-2', 'male-middle-1', 'male-middle-2',
  'female-young-1', 'female-young-2', 'female-middle-1', 'female-middle-2',
] as const

const lipSyncSchema = z.object({
  videoId: z.string().uuid(),
  originTaskId: z.string(), // 元のKlingタスクID
  // TTS（テキスト読み上げ）または音声ファイルURLのどちらか
  ttsText: z.string().max(1000).optional(),
  audioUrl: z.string().url().optional(),
  // TTS設定
  ttsTimbre: z.enum(TTS_TIMBRES).default('female-young-1'),
  ttsSpeed: z.number().min(0.8).max(2.0).default(1.0),
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
    const validationResult = lipSyncSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { videoId, originTaskId, ttsText, audioUrl, ttsTimbre, ttsSpeed } = validationResult.data

    // テキストか音声URLのどちらかが必須
    if (!ttsText && !audioUrl) {
      return NextResponse.json(
        { error: 'Either ttsText or audioUrl is required' },
        { status: 400 }
      )
    }

    // 動画存在チェック & 所有確認
    const { data: videoData, error: videoError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .eq('user_id', user.id)
      .single()

    if (videoError || !videoData) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      )
    }

    const video = videoData as {
      id: string
      title: string
      status: string
      product_id: string
      duration_seconds: number
      generation_config: Record<string, unknown> | null
    }

    // 動画が完了状態か確認
    if (video.status !== 'completed') {
      return NextResponse.json(
        { error: 'Video must be completed for lip sync' },
        { status: 400 }
      )
    }

    // PiAPI Lip Sync リクエスト
    const input: Record<string, unknown> = {
      origin_task_id: originTaskId,
    }

    if (ttsText) {
      // TTSモード
      input.tts_text = ttsText
      input.tts_timbre = ttsTimbre
      input.tts_speed = ttsSpeed
    } else if (audioUrl) {
      // 音声ファイルモード
      input.local_dubbing_url = audioUrl
    }

    const requestBody = {
      model: 'kling',
      task_type: 'lip_sync',
      input,
    }

    console.log('[Kling Lip Sync] Request:', JSON.stringify(requestBody, null, 2))

    const response = await fetch(`${KLING_API_BASE}/api/v1/task`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.KLING_API_KEY!,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('[Kling Lip Sync] API Error:', errorData)
      return NextResponse.json(
        { error: 'Failed to start lip sync', details: errorData },
        { status: response.status }
      )
    }

    const data = await response.json()
    const taskId = data.data?.task_id || data.task_id

    // 新しいLip Sync動画レコードを作成
    const { data: newVideo, error: insertError } = await supabase
      .from('videos')
      .insert({
        user_id: user.id,
        product_id: video.product_id,
        title: `${video.title} (Lip Sync)`,
        content_type: 'ai_generated',
        generation_method: 'kling',
        status: 'generating',
        duration_seconds: video.duration_seconds,
        generation_config: {
          ...(video.generation_config || {}),
          lipSync: true,
          originTaskId,
          lipSyncTaskId: taskId,
          ttsText: ttsText || null,
          audioUrl: audioUrl || null,
          ttsTimbre,
          ttsSpeed,
        },
      } as never)
      .select()
      .single()

    if (insertError) {
      console.error('[Kling Lip Sync] DB Error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create video record' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      video: {
        id: (newVideo as { id: string }).id,
        title: `${video.title} (Lip Sync)`,
        status: 'generating',
      },
      taskId,
      message: 'リップシンクを開始しました。完了まで1〜3分かかります。',
    })
  } catch (error) {
    console.error('[Kling Lip Sync] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// 利用可能なTTSタイプを取得
export async function GET() {
  return NextResponse.json({
    timbres: TTS_TIMBRES.map(t => ({
      id: t,
      label: t.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    })),
    speedRange: { min: 0.8, max: 2.0, default: 1.0 },
  })
}
