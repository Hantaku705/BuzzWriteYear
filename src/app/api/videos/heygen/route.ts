import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getHeyGenQueue } from '@/lib/queue/client'
import { z } from 'zod'
import { listAvatars, listVoices } from '@/lib/video/heygen/client'

// HeyGen生成リクエストスキーマ
const generateRequestSchema = z.object({
  avatarId: z.string().min(1),
  script: z.string().min(1).max(5000),
  voiceId: z.string().optional(),
  backgroundUrl: z.string().url().optional(),
  title: z.string().max(200).optional(),
  productId: z.string().uuid().optional(),
})

// POST: HeyGen動画生成開始
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // リクエストボディをパース
    const body = await request.json()
    const parseResult = generateRequestSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.issues },
        { status: 400 }
      )
    }

    const { avatarId, script, voiceId, backgroundUrl, title, productId } = parseResult.data

    // videosレコード作成
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .insert({
        user_id: user.id,
        product_id: productId || null,
        title: title || `HeyGen動画 - ${new Date().toLocaleString('ja-JP')}`,
        content_type: 'avatar',
        generation_method: 'heygen',
        status: 'generating',
        generation_config: {
          avatarId,
          script: script.slice(0, 100),
          voiceId,
          backgroundUrl,
        },
      } as never)
      .select('id')
      .single()

    type VideoRow = { id: string }
    const videoData = video as VideoRow | null

    if (videoError || !videoData) {
      console.error('Failed to create video record:', videoError)
      return NextResponse.json(
        { error: 'Failed to create video record' },
        { status: 500 }
      )
    }

    // BullMQキューにジョブ追加
    const queue = getHeyGenQueue()
    const job = await queue.add(
      'heygen-generate',
      {
        videoId: videoData.id,
        userId: user.id,
        avatarId,
        script,
        voiceId,
        backgroundUrl,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 30000,
        },
      }
    )

    return NextResponse.json(
      {
        video: {
          id: videoData.id,
        },
        jobId: job.id,
        status: 'queued',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('HeyGen generate error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET: アバター・ボイス一覧取得
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    if (type === 'avatars') {
      const avatars = await listAvatars()
      return NextResponse.json({ avatars })
    }

    if (type === 'voices') {
      const voices = await listVoices()
      return NextResponse.json({ voices })
    }

    // Both
    const [avatars, voices] = await Promise.all([
      listAvatars(),
      listVoices(),
    ])

    return NextResponse.json({ avatars, voices })
  } catch (error) {
    console.error('HeyGen assets fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch HeyGen assets' },
      { status: 500 }
    )
  }
}
