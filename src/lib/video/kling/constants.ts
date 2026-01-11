/**
 * Kling AI Constants & Types
 * クライアントサイドで安全に使用できる定数・型定義
 */

// ============================================
// 型定義
// ============================================

export type KlingMode = 'image-to-video' | 'text-to-video'
export type KlingDuration = 5 | 10
export type KlingModelVersion = '1.5' | '1.6' | '2.1' | '2.1-master' | '2.5' | '2.6'
export type KlingQuality = 'standard' | 'pro'
export type KlingAspectRatio = '16:9' | '9:16' | '1:1'

// 旧型との互換性
export type KlingModel = 'kling-v1' | 'kling-v1-5' | 'kling-v1-6' | 'kling-v2' | 'kling-v2-1'

export interface KlingGenerationRequest {
  mode: KlingMode
  prompt: string
  imageUrl?: string           // 開始フレーム (I2V時必須)
  imageTailUrl?: string       // 終了フレーム (O1デュアルキーフレーム)
  duration?: KlingDuration
  modelVersion?: KlingModelVersion
  quality?: KlingQuality
  aspectRatio?: KlingAspectRatio
  negativePrompt?: string
  cfgScale?: number           // 0.0 - 1.0, 推奨: 0.5
  enableAudio?: boolean       // 2.6のみ対応
  // 旧API互換
  model?: KlingModel
}

export interface KlingTaskResponse {
  task_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
}

export interface KlingTaskStatusResponse {
  task_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress?: number
  video_url?: string
  thumbnail_url?: string
  duration?: number
  error?: string
  created_at?: string
  completed_at?: string
}

// ============================================
// 価格設定
// ============================================

export const KLING_MODEL_INFO: Record<KlingModelVersion, {
  name: string
  nameJa: string
  std: number
  pro: number
  features: string[]
  proOnly?: boolean
}> = {
  '1.5': {
    name: 'Kling 1.5',
    nameJa: 'Kling 1.5 (レガシー)',
    std: 0.16,
    pro: 0.32,
    features: [],
  },
  '1.6': {
    name: 'Kling 1.6',
    nameJa: 'Kling 1.6 (スタンダード)',
    std: 0.16,
    pro: 0.32,
    features: ['dual_keyframe'],
  },
  '2.1': {
    name: 'Kling 2.1',
    nameJa: 'Kling 2.1 (高品質)',
    std: 0.195,
    pro: 0.33,
    features: ['dual_keyframe', 'better_motion'],
  },
  '2.1-master': {
    name: 'Kling 2.1 Master',
    nameJa: 'Kling 2.1 Master (プロ専用)',
    std: 0.96,
    pro: 0.96,
    features: ['dual_keyframe', 'best_quality'],
    proOnly: true,
  },
  '2.5': {
    name: 'Kling 2.5 Turbo',
    nameJa: 'Kling 2.5 Turbo (高速)',
    std: 0.195,
    pro: 0.33,
    features: ['dual_keyframe', 'faster_generation'],
  },
  '2.6': {
    name: 'Kling 2.6',
    nameJa: 'Kling 2.6 (音声対応)',
    std: 0.195,
    pro: 0.33,
    features: ['dual_keyframe', 'native_audio'],
  },
}

/**
 * 価格計算
 */
export function calculatePrice(
  modelVersion: KlingModelVersion,
  quality: KlingQuality,
  duration: KlingDuration
): number {
  const info = KLING_MODEL_INFO[modelVersion]
  const basePrice = quality === 'pro' ? info.pro : info.std
  const multiplier = duration === 10 ? 2 : 1
  return basePrice * multiplier
}

/**
 * 価格フォーマット
 */
export function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`
}

/**
 * Pro専用モデルか判定
 */
export function isProOnlyModel(modelVersion: KlingModelVersion): boolean {
  return KLING_MODEL_INFO[modelVersion].proOnly === true
}

/**
 * 音声生成対応か判定
 */
export function supportsAudio(modelVersion: KlingModelVersion): boolean {
  return KLING_MODEL_INFO[modelVersion].features.includes('native_audio')
}

/**
 * デュアルキーフレーム対応か判定
 */
export function supportsDualKeyframe(modelVersion: KlingModelVersion): boolean {
  return KLING_MODEL_INFO[modelVersion].features.includes('dual_keyframe')
}
