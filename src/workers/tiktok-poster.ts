import { Job } from 'bullmq'
import fs from 'fs'
import path from 'path'
import {
  createWorker,
  QUEUE_NAMES,
  TikTokPostingJobData,
} from '@/lib/queue/client'
import {
  initVideoUpload,
  uploadVideoChunk,
  waitForPublishComplete,
  refreshAccessToken,
} from '@/lib/tiktok/client'

// TikTok投稿処理
async function processTikTokPosting(
  job: Job<TikTokPostingJobData & {
    accessToken: string
    refreshToken: string
    openId: string
    privacyLevel?: 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'SELF_ONLY'
  }>
): Promise<{ publishId: string; publicVideoId?: string }> {
  const {
    videoId,
    videoUrl,
    title,
    description,
    accessToken,
    refreshToken,
    privacyLevel = 'PUBLIC_TO_EVERYONE',
  } = job.data

  console.log(`[TikTok Poster] Starting job ${job.id} for video ${videoId}`)
  console.log(`[TikTok Poster] Title: ${title}`)

  let currentAccessToken = accessToken

  try {
    // 進捗更新: 開始
    await job.updateProgress(10)

    // ローカルファイルパス解決
    const localPath = videoUrl.startsWith('/videos/')
      ? path.join(process.cwd(), 'public', videoUrl)
      : videoUrl

    if (!fs.existsSync(localPath)) {
      throw new Error(`Video file not found: ${localPath}`)
    }

    // ファイル読み込み
    const videoBuffer = fs.readFileSync(localPath)
    const videoSize = videoBuffer.length

    console.log(`[TikTok Poster] Video size: ${videoSize} bytes`)

    // アップロード初期化
    console.log('[TikTok Poster] Initializing upload...')
    let uploadInfo

    try {
      uploadInfo = await initVideoUpload(currentAccessToken, {
        title: `${title}${description ? ` - ${description}` : ''}`.slice(0, 150),
        privacy_level: privacyLevel,
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
      })
    } catch (error) {
      // トークン期限切れの可能性があるのでリフレッシュ試行
      console.log('[TikTok Poster] Token may be expired, refreshing...')
      const newToken = await refreshAccessToken(refreshToken)
      currentAccessToken = newToken.access_token

      uploadInfo = await initVideoUpload(currentAccessToken, {
        title: `${title}${description ? ` - ${description}` : ''}`.slice(0, 150),
        privacy_level: privacyLevel,
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
      })
    }

    await job.updateProgress(30)
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
      currentAccessToken,
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

    return {
      publishId: uploadInfo.video_id,
      publicVideoId: publishResult.public_video_id,
    }
  } catch (error) {
    console.error('[TikTok Poster] Error:', error)
    throw error
  }
}

// ワーカー起動
export function startTikTokPosterWorker() {
  const worker = createWorker<
    TikTokPostingJobData & {
      accessToken: string
      refreshToken: string
      openId: string
      privacyLevel?: 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'SELF_ONLY'
    }
  >(QUEUE_NAMES.TIKTOK_POSTING, async (job) => {
    const result = await processTikTokPosting(job)

    // TODO: Supabaseでビデオステータスを更新
    // const supabase = createClient()
    // await supabase
    //   .from('videos')
    //   .update({
    //     status: 'posted',
    //     tiktok_video_id: result.publicVideoId,
    //     posted_at: new Date().toISOString(),
    //   })
    //   .eq('id', job.data.videoId)

    return result
  })

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
