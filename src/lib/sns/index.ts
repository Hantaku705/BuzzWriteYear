/**
 * SNS動画分析Kit - エントリーポイント
 */

// プラットフォーム判定
export * from './platform'

// メトリクス計算
export * from './metrics'

// TikTok
export * from './tiktok-scraper'

// Instagram
export * from './instagram-scraper'

// YouTube
export * from './youtube-rss'

// Gemini分析
export * from './gemini'

// 統合分析関数
import { detectPlatform, Platform } from './platform'
import { getTikTokInsight, getTikTokVideoByUrl, downloadTikTokVideo, TikTokVideo } from './tiktok-scraper'
import { getInstagramInsight, getInstagramReelDetail, downloadInstagramReel, InstagramReel } from './instagram-scraper'
import { getYouTubeInsight, YouTubeVideo } from './youtube-rss'
import { analyzeVideoWithGemini, getSingleVideoPrompt } from './gemini'
import { VideoMetrics, generateMetricsSummary } from './metrics'

/**
 * 統合動画分析結果
 */
export interface UnifiedVideoAnalysis {
  platform: Platform
  video: TikTokVideo | InstagramReel | YouTubeVideo
  metrics?: VideoMetrics
  metricsSummary?: ReturnType<typeof generateMetricsSummary>
  aiAnalysis?: string
}

/**
 * URLから動画を分析（統合API）
 */
export async function analyzeVideoByUrl(
  url: string,
  options: {
    includeAIAnalysis?: boolean
    aiPrompt?: string
  } = {}
): Promise<UnifiedVideoAnalysis> {
  const platform = detectPlatform(url)

  if (!platform) {
    throw new Error('Unsupported platform URL')
  }

  let video: TikTokVideo | InstagramReel | YouTubeVideo
  let videoBuffer: Buffer | null = null

  switch (platform) {
    case 'TikTok': {
      video = await getTikTokVideoByUrl(url)
      if (options.includeAIAnalysis) {
        videoBuffer = await downloadTikTokVideo(url)
      }
      break
    }
    case 'Instagram': {
      video = await getInstagramReelDetail(url)
      if (options.includeAIAnalysis) {
        videoBuffer = await downloadInstagramReel(url)
      }
      break
    }
    default:
      throw new Error(`Platform ${platform} video analysis not fully supported yet`)
  }

  const result: UnifiedVideoAnalysis = {
    platform,
    video,
  }

  // メトリクスがある場合はサマリーを計算
  if ('metrics' in video && video.metrics) {
    result.metrics = video.metrics
    result.metricsSummary = generateMetricsSummary(video.metrics)
  }

  // AI分析
  if (options.includeAIAnalysis && videoBuffer) {
    result.aiAnalysis = await analyzeVideoWithGemini(
      videoBuffer,
      options.aiPrompt || getSingleVideoPrompt()
    )
  }

  return result
}

/**
 * プロフィールURLから分析（統合API）
 */
export async function analyzeProfileByUrl(
  url: string,
  options: {
    videoCount?: number
  } = {}
): Promise<{
  platform: Platform
  user: unknown
  videos: unknown[]
  aggregatedMetrics: VideoMetrics
  metricsSummary: ReturnType<typeof generateMetricsSummary>
}> {
  const platform = detectPlatform(url)

  if (!platform) {
    throw new Error('Unsupported platform URL')
  }

  const videoCount = options.videoCount || 30

  switch (platform) {
    case 'TikTok': {
      const insight = await getTikTokInsight(url, videoCount)
      return {
        platform,
        user: insight.user,
        videos: insight.videos,
        aggregatedMetrics: insight.aggregatedMetrics,
        metricsSummary: generateMetricsSummary(insight.aggregatedMetrics),
      }
    }
    case 'Instagram': {
      const insight = await getInstagramInsight(url, videoCount)
      return {
        platform,
        user: insight.user,
        videos: insight.reels,
        aggregatedMetrics: insight.aggregatedMetrics,
        metricsSummary: generateMetricsSummary(insight.aggregatedMetrics),
      }
    }
    case 'YouTube': {
      const insight = await getYouTubeInsight(url)
      // YouTubeはメトリクスなし
      return {
        platform,
        user: insight.channel,
        videos: insight.videos,
        aggregatedMetrics: { playCount: 0, likeCount: 0, commentCount: 0, shareCount: 0 },
        metricsSummary: generateMetricsSummary({ playCount: 0, likeCount: 0, commentCount: 0, shareCount: 0 }),
      }
    }
    default:
      throw new Error(`Platform ${platform} profile analysis not supported yet`)
  }
}
