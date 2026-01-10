import { Job } from 'bullmq'
import {
  createWorker,
  QUEUE_NAMES,
  AnalyticsCollectionJobData,
} from '@/lib/queue/client'
import { getVideoStats, refreshAccessToken } from '@/lib/tiktok/client'

// 分析データ収集処理
async function processAnalyticsCollection(
  job: Job<
    AnalyticsCollectionJobData & {
      accessToken: string
      refreshToken: string
    }
  >
): Promise<{
  videoId: string
  stats: {
    views: number
    likes: number
    comments: number
    shares: number
  }
}> {
  const { videoId, tiktokVideoId, accessToken, refreshToken } = job.data

  console.log(`[Analytics Collector] Starting job ${job.id} for video ${videoId}`)
  console.log(`[Analytics Collector] TikTok Video ID: ${tiktokVideoId}`)

  let currentAccessToken = accessToken

  try {
    await job.updateProgress(10)

    // TikTokから統計データ取得
    let stats

    try {
      const videoStats = await getVideoStats(currentAccessToken, [tiktokVideoId])
      stats = videoStats[0]
    } catch (error) {
      // トークン期限切れの可能性があるのでリフレッシュ試行
      console.log('[Analytics Collector] Token may be expired, refreshing...')
      const newToken = await refreshAccessToken(refreshToken)
      currentAccessToken = newToken.access_token

      const videoStats = await getVideoStats(currentAccessToken, [tiktokVideoId])
      stats = videoStats[0]
    }

    await job.updateProgress(80)

    if (!stats) {
      throw new Error(`Video stats not found for TikTok video: ${tiktokVideoId}`)
    }

    console.log('[Analytics Collector] Stats retrieved:', {
      views: stats.view_count,
      likes: stats.like_count,
      comments: stats.comment_count,
      shares: stats.share_count,
    })

    await job.updateProgress(100)

    return {
      videoId,
      stats: {
        views: stats.view_count,
        likes: stats.like_count,
        comments: stats.comment_count,
        shares: stats.share_count,
      },
    }
  } catch (error) {
    console.error('[Analytics Collector] Error:', error)
    throw error
  }
}

// ワーカー起動
export function startAnalyticsCollectorWorker() {
  const worker = createWorker<
    AnalyticsCollectionJobData & {
      accessToken: string
      refreshToken: string
    }
  >(QUEUE_NAMES.ANALYTICS_COLLECTION, async (job) => {
    const result = await processAnalyticsCollection(job)

    // TODO: Supabaseに分析データを保存
    // const supabase = createClient()
    // await supabase.from('video_analytics').insert({
    //   video_id: result.videoId,
    //   views: result.stats.views,
    //   likes: result.stats.likes,
    //   comments: result.stats.comments,
    //   shares: result.stats.shares,
    //   recorded_at: new Date().toISOString(),
    // })

    return result
  })

  worker.on('completed', (job, result) => {
    console.log(`[Analytics Collector] Job ${job.id} completed:`, result)
  })

  worker.on('failed', (job, error) => {
    console.error(`[Analytics Collector] Job ${job?.id} failed:`, error)
  })

  worker.on('progress', (job, progress) => {
    console.log(`[Analytics Collector] Job ${job.id} progress: ${progress}%`)
  })

  console.log('[Analytics Collector] Worker started')

  return worker
}

// スタンドアロン実行用
if (require.main === module) {
  startAnalyticsCollectorWorker()
}
