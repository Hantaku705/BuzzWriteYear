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
    const useTls = url.protocol === 'rediss:'
    return {
      host: url.hostname,
      port: parseInt(url.port) || 6379,
      password: url.password || undefined,
      username: url.username || undefined,
      maxRetriesPerRequest: null,
      tls: useTls ? {} : undefined,
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
  VIDEO_PIPELINE: 'video-pipeline',
  VIDEO_VARIANTS: 'video-variants',
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
  mode:
    | 'image-to-video'
    | 'text-to-video'
    | 'elements'
    | 'video-edit'       // V2V自然言語編集
    | 'style-transfer'   // スタイル変換
    | 'inpaint'          // オブジェクト削除
    | 'background'       // 背景変更
    | 'motion-ref'       // モーション参照
    | 'camera-control'   // カメラ制御
  imageUrl?: string
  imageTailUrl?: string           // O1デュアルキーフレーム（終了フレーム）
  prompt: string
  negativePrompt?: string
  duration: 5 | 10
  presetId?: string
  // O1新パラメータ
  modelVersion?: '1.5' | '1.6' | '2.1' | '2.1-master' | '2.5' | '2.6'
  aspectRatio?: '16:9' | '9:16' | '1:1'
  quality?: 'standard' | 'pro'
  cfgScale?: number
  enableAudio?: boolean           // 2.6のみ
  // Elements固有パラメータ
  elementImages?: string[]        // 最大7枚の要素画像URL

  // ============================================
  // O1 Advanced機能パラメータ
  // ============================================

  // V2V編集用
  originTaskId?: string           // 元のKlingタスクID
  editPrompt?: string             // 編集指示（自然言語）
  editStrength?: number           // 0.0-1.0

  // スタイル変換用
  stylePresetId?: string          // スタイルプリセットID
  styleImageUrl?: string          // スタイル参照画像URL

  // Inpaint用
  removePrompt?: string           // 削除対象（自然言語）

  // 背景変更用
  backgroundPresetId?: string     // 背景プリセットID
  backgroundPrompt?: string       // 背景テキスト指定
  backgroundImageUrl?: string     // 背景参照画像URL

  // モーション参照用
  motionPresetId?: string         // モーションプリセットID
  motionVideoUrl?: string         // 参照動画URL
  motionStrength?: number         // 0.0-1.0

  // カメラ制御用
  cameraPresetId?: string         // カメラプリセットID
  cameraReferenceVideoUrl?: string // 参照動画URL
  cameraControls?: Array<{
    type: 'pan' | 'tilt' | 'zoom' | 'roll' | 'truck' | 'dolly'
    direction?: 'left' | 'right' | 'up' | 'down' | 'in' | 'out' | 'cw' | 'ccw'
    speed?: 'slow' | 'medium' | 'fast'
    amount?: number
  }>
}

export interface PipelineJobData {
  videoId: string
  userId: string
  sourceUrl: string
  preset: 'tiktok_ugc' | 'review' | 'simple' | 'custom'
  config?: {
    ugcEffects?: {
      enabled: boolean
      effects: string[]
      intensity?: 'light' | 'medium' | 'heavy'
    }
    trim?: {
      enabled: boolean
      startTime: number
      endTime?: number
    }
    subtitles?: {
      enabled: boolean
      entries: Array<{
        startTime: number
        endTime: number
        text: string
      }>
    }
    optimize?: {
      enabled: boolean
      platform: 'tiktok' | 'instagram_reels' | 'youtube_shorts' | 'twitter'
    }
  }
}

export interface VariantJobData {
  sourceVideoId: string
  sourceUrl: string
  variantIds: string[]
  userId: string
  preset: 'tiktok_ab' | 'multi_platform' | 'full_test' | 'custom'
  customVariants?: Array<{
    name: string
    ugcEffects?: {
      effects: string[]
      intensity: 'light' | 'medium' | 'heavy'
    }
    subtitles?: {
      entries: Array<{
        startTime: number
        endTime: number
        text: string
      }>
    }
    platform?: 'tiktok' | 'instagram_reels' | 'youtube_shorts' | 'twitter'
  }>
  subtitleTexts?: string[]
  duration: number
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pipelineQueue: Queue | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let variantQueue: Queue | null = null

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

export const getPipelineQueue = () => {
  if (!pipelineQueue) {
    pipelineQueue = new Queue(
      QUEUE_NAMES.VIDEO_PIPELINE,
      { connection: getRedisConnection() }
    )
  }
  return pipelineQueue
}

export const getVariantQueue = () => {
  if (!variantQueue) {
    variantQueue = new Queue(
      QUEUE_NAMES.VIDEO_VARIANTS,
      { connection: getRedisConnection() }
    )
  }
  return variantQueue
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

export const addPipelineJob = async (
  data: PipelineJobData,
  options?: { delay?: number; priority?: number }
) => {
  const queue = getPipelineQueue()
  return queue.add('process', data, {
    delay: options?.delay,
    priority: options?.priority,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 10000,
    },
  })
}

export const addVariantJob = async (
  data: VariantJobData,
  options?: { delay?: number; priority?: number }
) => {
  const queue = getVariantQueue()
  return queue.add('generate', data, {
    delay: options?.delay,
    priority: options?.priority,
    attempts: 2, // バリアントは複数あるのでリトライ少なめ
    backoff: {
      type: 'exponential',
      delay: 15000,
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
