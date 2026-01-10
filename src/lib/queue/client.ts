import { Queue, Worker, Job, ConnectionOptions } from 'bullmq'

// Redis接続オプション（環境変数から取得）
const getRedisConnection = (): ConnectionOptions => {
  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) {
    console.warn('REDIS_URL not set, using default localhost')
    return {
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: null,
    }
  }
  // Parse Redis URL for connection options
  try {
    const url = new URL(redisUrl)
    return {
      host: url.hostname,
      port: parseInt(url.port) || 6379,
      password: url.password || undefined,
      username: url.username || undefined,
      maxRetriesPerRequest: null,
    }
  } catch {
    // If URL parsing fails, return localhost defaults
    console.warn('Failed to parse REDIS_URL, using default localhost')
    return {
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: null,
    }
  }
}

// キュー名
export const QUEUE_NAMES = {
  VIDEO_GENERATION: 'video-generation',
  UGC_PROCESSING: 'ugc-processing',
  HEYGEN_GENERATION: 'heygen-generation',
  KLING_GENERATION: 'kling-generation',
  TIKTOK_POSTING: 'tiktok-posting',
  ANALYTICS_COLLECTION: 'analytics-collection',
} as const

// ジョブデータ型
export interface VideoGenerationJobData {
  videoId: string
  userId: string
  productId: string
  templateId: string
  compositionId: 'ProductIntro' | 'BeforeAfter' | 'ReviewText' | 'FeatureList'
  inputProps: Record<string, unknown>
}

export interface TikTokPostingJobData {
  videoId: string
  userId: string
  videoUrl: string
  title: string
  description?: string
  scheduledAt?: string
}

export interface AnalyticsCollectionJobData {
  videoId: string
  userId: string
  tiktokVideoId: string
}

export interface UGCProcessingJobData {
  videoId: string
  userId: string
  inputPath: string
  preset?: 'tiktok' | 'review' | 'vintage' | 'custom'
  customEffects?: string[]
  intensity?: 'light' | 'medium' | 'heavy'
}

export interface HeyGenJobData {
  videoId: string
  userId: string
  avatarId: string
  script: string
  voiceId?: string
  backgroundUrl?: string
}

export interface KlingJobData {
  videoId: string
  userId: string
  productId: string
  mode: 'image-to-video' | 'text-to-video'
  imageUrl?: string
  prompt: string
  negativePrompt?: string
  duration: 5 | 10
  presetId?: string
}

// キューインスタンス（遅延初期化）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let videoGenerationQueue: Queue | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ugcProcessingQueue: Queue | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let heygenQueue: Queue | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let klingQueue: Queue | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let tiktokPostingQueue: Queue | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let analyticsQueue: Queue | null = null

export const getVideoGenerationQueue = () => {
  if (!videoGenerationQueue) {
    videoGenerationQueue = new Queue(
      QUEUE_NAMES.VIDEO_GENERATION,
      { connection: getRedisConnection() }
    )
  }
  return videoGenerationQueue
}

export const getUGCProcessingQueue = () => {
  if (!ugcProcessingQueue) {
    ugcProcessingQueue = new Queue(
      QUEUE_NAMES.UGC_PROCESSING,
      { connection: getRedisConnection() }
    )
  }
  return ugcProcessingQueue
}

export const getHeyGenQueue = () => {
  if (!heygenQueue) {
    heygenQueue = new Queue(
      QUEUE_NAMES.HEYGEN_GENERATION,
      { connection: getRedisConnection() }
    )
  }
  return heygenQueue
}

export const getKlingQueue = () => {
  if (!klingQueue) {
    klingQueue = new Queue(
      QUEUE_NAMES.KLING_GENERATION,
      { connection: getRedisConnection() }
    )
  }
  return klingQueue
}

export const getTikTokPostingQueue = () => {
  if (!tiktokPostingQueue) {
    tiktokPostingQueue = new Queue(
      QUEUE_NAMES.TIKTOK_POSTING,
      { connection: getRedisConnection() }
    )
  }
  return tiktokPostingQueue
}

export const getAnalyticsQueue = () => {
  if (!analyticsQueue) {
    analyticsQueue = new Queue(
      QUEUE_NAMES.ANALYTICS_COLLECTION,
      { connection: getRedisConnection() }
    )
  }
  return analyticsQueue
}

// ジョブ追加ヘルパー
export const addVideoGenerationJob = async (
  data: VideoGenerationJobData,
  options?: { delay?: number; priority?: number }
) => {
  const queue = getVideoGenerationQueue()
  return queue.add('generate', data, {
    delay: options?.delay,
    priority: options?.priority,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  })
}

export const addTikTokPostingJob = async (
  data: TikTokPostingJobData,
  options?: { delay?: number }
) => {
  const queue = getTikTokPostingQueue()
  return queue.add('post', data, {
    delay: options?.delay,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 10000,
    },
  })
}

export const addAnalyticsCollectionJob = async (
  data: AnalyticsCollectionJobData
) => {
  const queue = getAnalyticsQueue()
  return queue.add('collect', data, {
    repeat: {
      every: 1000 * 60 * 60 * 6, // 6時間ごと
    },
    attempts: 3,
  })
}

export const addUGCProcessingJob = async (
  data: UGCProcessingJobData,
  options?: { delay?: number; priority?: number }
) => {
  const queue = getUGCProcessingQueue()
  return queue.add('process', data, {
    delay: options?.delay,
    priority: options?.priority,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  })
}

export const addHeyGenJob = async (
  data: HeyGenJobData,
  options?: { delay?: number; priority?: number }
) => {
  const queue = getHeyGenQueue()
  return queue.add('generate', data, {
    delay: options?.delay,
    priority: options?.priority,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 10000,
    },
  })
}

export const addKlingJob = async (
  data: KlingJobData,
  options?: { delay?: number; priority?: number }
) => {
  const queue = getKlingQueue()
  return queue.add('generate', data, {
    delay: options?.delay,
    priority: options?.priority,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 15000, // Kling APIは時間がかかるため長めに設定
    },
  })
}

// ワーカー作成ヘルパー
export const createWorker = <T>(
  queueName: string,
  processor: (job: Job<T>) => Promise<unknown>
) => {
  return new Worker<T>(queueName, processor, {
    connection: getRedisConnection(),
    concurrency: 2,
  })
}
