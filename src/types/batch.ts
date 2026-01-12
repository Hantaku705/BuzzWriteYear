// バッチ生成関連の型定義

export type BatchJobType = 'heygen' | 'kling'
export type BatchJobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
export type BatchItemStatus = 'pending' | 'processing' | 'completed' | 'failed'

// HeyGen共通設定
export interface HeyGenBatchConfig {
  type: 'heygen'
  avatarId: string
  voiceId?: string
  backgroundUrl?: string
}

// Kling共通設定
export interface KlingBatchConfig {
  type: 'kling'
  modelVersion: '1.5' | '1.6' | '2.1' | '2.5' | '2.6'
  aspectRatio: '16:9' | '9:16' | '1:1'
  quality: 'standard' | 'pro'
  duration: 5 | 10
  enableAudio?: boolean
}

export type BatchConfig = HeyGenBatchConfig | KlingBatchConfig

// バッチジョブアイテム（CSV行）
export interface BatchJobItem {
  id: string
  batch_job_id: string
  video_id: string | null
  status: BatchItemStatus
  item_index: number
  config: {
    title?: string
    script?: string      // HeyGen用
    prompt?: string      // Kling用
    imageUrl?: string    // Kling I2V用
    productId?: string
  }
  error_message: string | null
  created_at: string
  completed_at: string | null
}

// バッチジョブ
export interface BatchJob {
  id: string
  user_id: string
  type: BatchJobType
  name: string | null
  status: BatchJobStatus
  total_count: number
  completed_count: number
  failed_count: number
  config: BatchConfig
  created_at: string
  started_at: string | null
  completed_at: string | null
  items?: BatchJobItem[]
}

// CSV入力行
export interface BatchCSVRow {
  title?: string
  script?: string      // HeyGen用
  prompt?: string      // Kling用
  imageUrl?: string    // Kling I2V用
  productId?: string
}

// バッチ作成リクエスト
export interface CreateBatchRequest {
  type: BatchJobType
  name?: string
  config: BatchConfig
  items: BatchCSVRow[]
}

// バッチ作成レスポンス
export interface CreateBatchResponse {
  batchJob: {
    id: string
    totalCount: number
    status: BatchJobStatus
  }
}

// バッチステータスレスポンス
export interface BatchStatusResponse {
  id: string
  type: BatchJobType
  name: string | null
  status: BatchJobStatus
  totalCount: number
  completedCount: number
  failedCount: number
  progress: number
  items: BatchJobItem[]
  createdAt: string
  startedAt: string | null
  completedAt: string | null
}
