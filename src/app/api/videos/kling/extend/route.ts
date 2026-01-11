import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const KLING_API_BASE = 'https://api.piapi.ai'

const extendVideoSchema = z.object({
  videoId: z.string().uuid(),
  originTaskId: z.string(), // 元のKlingタスクID
  prompt: z.string().max(2500).optional(), // 延長部分のプロンプト（オプション）
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
    const validationResult = extendVideoSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { videoId, originTaskId, prompt } = validationResult.data

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
      generation_config: Record<string, unknown> | null
    }

    // 動画が完了状態か確認
    if (video.status !== 'completed') {
      return NextResponse.json(
        { error: 'Video must be completed to extend' },
        { status: 400 }
      )
    }

    // PiAPI Extend Video リクエスト
    const requestBody: Record<string, unknown> = {
      model: 'kling',
      task_type: 'extend_video',
      input: {
        origin_task_id: originTaskId,
      },
    }

    // 延長部分のプロンプトがあれば追加
    if (prompt) {
      (requestBody.input as Record<string, unknown>).prompt = prompt
    }

    console.log('[Kling Extend] Request:', JSON.stringify(requestBody, null, 2))

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
      console.error('[Kling Extend] API Error:', errorData)
      return NextResponse.json(
        { error: 'Failed to extend video', details: errorData },
        { status: response.status }
      )
    }

    const data = await response.json()
    const taskId = data.data?.task_id || data.task_id

    // 新しい延長動画レコードを作成
    const { data: newVideo, error: insertError } = await supabase
      .from('videos')
      .insert({
        user_id: user.id,
        product_id: video.product_id,
        title: `${video.title} (Extended)`,
        content_type: 'ai_generated',
        generation_method: 'kling',
        status: 'generating',
        duration_seconds: 10, // 延長後は10秒
        generation_config: {
          ...(video.generation_config || {}),
          extended: true,
          originTaskId,
          extendTaskId: taskId,
        },
      } as never)
      .select()
      .single()

    if (insertError) {
      console.error('[Kling Extend] DB Error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create video record' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      video: {
        id: (newVideo as { id: string }).id,
        title: `${video.title} (Extended)`,
        status: 'generating',
      },
      taskId,
      message: '動画延長を開始しました。完了まで1〜3分かかります。',
    })
  } catch (error) {
    console.error('[Kling Extend] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
