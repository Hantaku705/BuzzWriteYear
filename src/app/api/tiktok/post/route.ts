import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTikTokPostingQueue } from '@/lib/queue/client'
import { z } from 'zod'
import type { PostToTikTokResponse, TikTokPostJobData } from '@/types/tiktok'

const postRequestSchema = z.object({
  videoId: z.string().uuid(),
  accountId: z.string().uuid(),
  caption: z.string().max(2200),
  hashtags: z.array(z.string()).max(30),
  privacyLevel: z.enum(['PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'SELF_ONLY']),
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // リクエストボディをパース
    const body = await request.json()
    const parseResult = postRequestSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.issues },
        { status: 400 }
      )
    }

    const { videoId, accountId, caption, hashtags, privacyLevel } = parseResult.data

    // 動画の存在確認とステータスチェック
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('id, status, remote_url')
      .eq('id', videoId)
      .eq('user_id', user.id)
      .single()

    type VideoRow = {
      id: string
      status: string
      remote_url: string | null
    }
    const videoData = video as VideoRow | null

    if (videoError || !videoData) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      )
    }

    if (videoData.status !== 'ready') {
      return NextResponse.json(
        { error: 'Video is not ready for posting' },
        { status: 400 }
      )
    }

    if (!videoData.remote_url) {
      return NextResponse.json(
        { error: 'Video URL is not available' },
        { status: 400 }
      )
    }

    // TikTokアカウントの存在確認
    const { data: account, error: accountError } = await supabase
      .from('tiktok_accounts')
      .select('id, is_active')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single()

    type AccountRow = {
      id: string
      is_active: boolean
    }
    const accountData = account as AccountRow | null

    if (accountError || !accountData) {
      return NextResponse.json(
        { error: 'TikTok account not found' },
        { status: 404 }
      )
    }

    if (!accountData.is_active) {
      return NextResponse.json(
        { error: 'TikTok account is not active' },
        { status: 400 }
      )
    }

    // tiktok_postsレコード作成
    const { data: post, error: postError } = await supabase
      .from('tiktok_posts')
      .insert({
        video_id: videoId,
        tiktok_account_id: accountId,
        caption,
        hashtags,
        privacy_level: privacyLevel,
        status: 'pending',
      } as never)
      .select('id')
      .single()

    type PostRow = { id: string }
    const postData = post as PostRow | null

    if (postError || !postData) {
      console.error('Failed to create TikTok post:', postError)
      return NextResponse.json(
        { error: 'Failed to create post' },
        { status: 500 }
      )
    }

    // BullMQキューにジョブ追加
    const queue = getTikTokPostingQueue()
    const jobData: TikTokPostJobData = {
      postId: postData.id,
      videoId,
      accountId,
      caption,
      hashtags,
      privacyLevel,
      userId: user.id,
    }

    const job = await queue.add('post', jobData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 10000,
      },
    })

    const response: PostToTikTokResponse = {
      postId: postData.id,
      jobId: job.id ?? '',
      status: 'queued',
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('TikTok post error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
