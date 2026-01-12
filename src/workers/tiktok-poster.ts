import { Job } from 'bullmq'
import { createClient } from '@supabase/supabase-js'
import {
  createWorker,
  QUEUE_NAMES,
} from '@/lib/queue/client'
import {
  initVideoUpload,
  uploadVideoChunk,
  waitForPublishComplete,
  refreshAccessToken,
} from '@/lib/tiktok/client'
import type { TikTokPostJobData } from '@/types/tiktok'

// Service role Supabaseクライアント
const getServiceSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

// tiktok_postsステータス更新
async function updatePostStatus(
  postId: string,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  updates: {
    publish_id?: string
    public_video_id?: string
    error_message?: string
    posted_at?: string
  } = {}
) {
  const supabase = getServiceSupabase()
  const { error } = await supabase
    .from('tiktok_posts')
    .update({
      status,
      ...updates,
    } as never)
    .eq('id', postId)

  if (error) {
    console.error('[TikTok Poster] Failed to update post status:', error)
  }
}

// videosテーブル更新
async function updateVideoStatus(
  videoId: string,
  tiktokVideoId: string
) {
  const supabase = getServiceSupabase()
  const { error } = await supabase
    .from('videos')
    .update({
      status: 'posted',
      tiktok_video_id: tiktokVideoId,
      posted_at: new Date().toISOString(),
    } as never)
    .eq('id', videoId)

  if (error) {
    console.error('[TikTok Poster] Failed to update video status:', error)
  }
}

// TikTok投稿処理
async function processTikTokPosting(
  job: Job<TikTokPostJobData>
): Promise<{ publishId: string; publicVideoId?: string }> {
  const {
    postId,
    videoId,
    accountId,
    caption,
    hashtags,
    privacyLevel,
  } = job.data

  console.log(`[TikTok Poster] Starting job ${job.id} for post ${postId}`)

  const supabase = getServiceSupabase()

  try {
    // ステータスを processing に更新
    await updatePostStatus(postId, 'processing')
    await job.updateProgress(10)

    // TikTokアカウント情報取得
    const { data: account, error: accountError } = await supabase
      .from('tiktok_accounts')
      .select('access_token, refresh_token, open_id')
      .eq('id', accountId)
      .single()

    if (accountError || !account) {
      throw new Error('TikTok account not found')
    }

    let accessToken = account.access_token

    // 動画情報取得
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('remote_url, title')
      .eq('id', videoId)
      .single()

    if (videoError || !video || !video.remote_url) {
      throw new Error('Video not found or has no URL')
    }

    await job.updateProgress(20)

    // キャプション作成（ハッシュタグ付加）
    const fullCaption = [
      caption,
      ...hashtags,
    ].join(' ').slice(0, 2200)

    console.log(`[TikTok Poster] Caption: ${fullCaption.slice(0, 50)}...`)

    // 動画ダウンロード
    console.log('[TikTok Poster] Downloading video...')
    const videoResponse = await fetch(video.remote_url)
    if (!videoResponse.ok) {
      throw new Error('Failed to download video')
    }
    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer())
    const videoSize = videoBuffer.length

    console.log(`[TikTok Poster] Video size: ${videoSize} bytes`)
    await job.updateProgress(30)

    // アップロード初期化
    console.log('[TikTok Poster] Initializing upload...')
    let uploadInfo

    try {
      uploadInfo = await initVideoUpload(accessToken, {
        title: fullCaption.slice(0, 150),
        privacy_level: privacyLevel,
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
      })
    } catch (error) {
      // トークン期限切れの可能性があるのでリフレッシュ試行
      console.log('[TikTok Poster] Token may be expired, refreshing...')
      const newToken = await refreshAccessToken(account.refresh_token)
      accessToken = newToken.access_token

      // 新しいトークンを保存
      await supabase
        .from('tiktok_accounts')
        .update({
          access_token: newToken.access_token,
          refresh_token: newToken.refresh_token,
          token_expires_at: new Date(Date.now() + newToken.expires_in * 1000).toISOString(),
        } as never)
        .eq('id', accountId)

      uploadInfo = await initVideoUpload(accessToken, {
        title: fullCaption.slice(0, 150),
        privacy_level: privacyLevel,
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
      })
    }

    await job.updateProgress(40)
    await updatePostStatus(postId, 'processing', { publish_id: uploadInfo.video_id })
    console.log('[TikTok Poster] Upload initialized:', uploadInfo.video_id)

    // 動画アップロード
    console.log('[TikTok Poster] Uploading video...')
    const contentRange = `bytes 0-${videoSize - 1}/${videoSize}`
    await uploadVideoChunk(uploadInfo.upload_url, videoBuffer, contentRange)

    await job.updateProgress(60)
    console.log('[TikTok Poster] Video uploaded')

    // 公開完了まで待機
    console.log('[TikTok Poster] Waiting for publish...')
    const publishResult = await waitForPublishComplete(
      accessToken,
      uploadInfo.video_id,
      {
        maxAttempts: 60,
        pollInterval: 5000,
        onProgress: (status) => {
          console.log(`[TikTok Poster] Status: ${status.status}`)
          if (status.status === 'PROCESSING_UPLOAD') {
            job.updateProgress(70)
          } else if (status.status === 'PROCESSING_DOWNLOAD') {
            job.updateProgress(80)
          } else if (status.status === 'SEND_TO_USER_INBOX') {
            job.updateProgress(90)
          }
        },
      }
    )

    await job.updateProgress(100)
    console.log('[TikTok Poster] Published:', publishResult.public_video_id)

    // 成功時のDB更新
    await updatePostStatus(postId, 'completed', {
      public_video_id: publishResult.public_video_id,
      posted_at: new Date().toISOString(),
    })

    if (publishResult.public_video_id) {
      await updateVideoStatus(videoId, publishResult.public_video_id)
    }

    return {
      publishId: uploadInfo.video_id,
      publicVideoId: publishResult.public_video_id,
    }
  } catch (error) {
    console.error('[TikTok Poster] Error:', error)

    // 失敗時のDB更新
    await updatePostStatus(postId, 'failed', {
      error_message: error instanceof Error ? error.message : 'Unknown error',
    })

    throw error
  }
}

// ワーカー起動
export function startTikTokPosterWorker() {
  const worker = createWorker<TikTokPostJobData>(
    QUEUE_NAMES.TIKTOK_POSTING,
    async (job) => {
      return await processTikTokPosting(job)
    }
  )

  worker.on('completed', (job, result) => {
    console.log(`[TikTok Poster] Job ${job.id} completed:`, result)
  })

  worker.on('failed', (job, error) => {
    console.error(`[TikTok Poster] Job ${job?.id} failed:`, error)
  })

  worker.on('progress', (job, progress) => {
    console.log(`[TikTok Poster] Job ${job.id} progress: ${progress}%`)
  })

  console.log('[TikTok Poster] Worker started')

  return worker
}

// スタンドアロン実行用
if (require.main === module) {
  startTikTokPosterWorker()
}
