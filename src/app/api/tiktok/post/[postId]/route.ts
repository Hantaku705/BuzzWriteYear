import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { PostStatusResponse, TikTokPostStatus } from '@/types/tiktok'

// 投稿ステータスに応じた進捗率
const STATUS_PROGRESS: Record<TikTokPostStatus, number> = {
  pending: 0,
  processing: 50,
  completed: 100,
  failed: 0,
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const supabase = await createClient()
    const { postId } = await params

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 投稿情報取得
    const { data: post, error: postError } = await supabase
      .from('tiktok_posts')
      .select('id, status, public_video_id, error_message, posted_at, video_id')
      .eq('id', postId)
      .single()

    type TikTokPostRow = {
      id: string
      status: string
      public_video_id: string | null
      error_message: string | null
      posted_at: string | null
      video_id: string
    }
    const postData = post as TikTokPostRow | null

    if (postError || !postData) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    // 動画の所有者確認
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('user_id')
      .eq('id', postData.video_id)
      .single()

    type VideoRow = { user_id: string }
    const videoData = video as VideoRow | null

    if (videoError || !videoData || videoData.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    const status = postData.status as TikTokPostStatus

    const response: PostStatusResponse = {
      id: postData.id,
      status,
      progress: STATUS_PROGRESS[status] || 0,
      publicVideoId: postData.public_video_id,
      errorMessage: postData.error_message,
      postedAt: postData.posted_at,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('TikTok post status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
