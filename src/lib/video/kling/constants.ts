/**
 * Kling AI Constants & Types
 * クライアントサイドで安全に使用できる定数・型定義
 */

// ============================================
// 型定義
// ============================================

export type KlingMode =
  | 'image-to-video'
  | 'text-to-video'
  | 'elements'
  | 'video-edit'       // V2V自然言語編集
  | 'style-transfer'   // スタイル変換
  | 'inpaint'          // オブジェクト削除
  | 'background'       // 背景変更
  | 'motion-ref'       // モーション参照
  | 'camera-control'   // カメラ制御
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
// O1 Advanced機能 型定義
// ============================================

// Elements最大枚数（4→7に拡張）
export const MAX_ELEMENT_IMAGES = 7

// カメラ制御
export interface CameraControl {
  type: 'pan' | 'tilt' | 'zoom' | 'roll' | 'truck' | 'dolly'
  direction?: 'left' | 'right' | 'up' | 'down' | 'in' | 'out' | 'cw' | 'ccw'
  speed?: 'slow' | 'medium' | 'fast'
  amount?: number  // 0-100
}

// V2V編集リクエスト
export interface KlingV2VEditRequest {
  originTaskId: string       // 元のKlingタスクID
  editPrompt: string         // 編集指示（自然言語）
  strength?: number          // 0.0-1.0
}

// スタイル変換リクエスト
export interface KlingStyleTransferRequest {
  originTaskId: string       // 元のKlingタスクID
  stylePresetId?: string     // プリセットID
  styleImageUrl?: string     // スタイル参照画像URL
  customPrompt?: string      // カスタムスタイルプロンプト
  strength?: number          // 0.0-1.0
}

// オブジェクト削除（Inpaint）リクエスト
export interface KlingInpaintRequest {
  originTaskId: string       // 元のKlingタスクID
  removePrompt: string       // 削除対象（自然言語）
  maskImageUrl?: string      // マスク画像（将来用）
}

// 背景変更リクエスト
export interface KlingBackgroundReplaceRequest {
  originTaskId: string       // 元のKlingタスクID
  backgroundPresetId?: string // 背景プリセットID
  backgroundPrompt?: string  // 背景テキスト指定
  backgroundImageUrl?: string // 背景参照画像URL
}

// モーション参照リクエスト
export interface KlingMotionRefRequest {
  imageUrl: string           // ソース画像
  prompt: string             // プロンプト
  motionPresetId?: string    // モーションプリセットID
  motionVideoUrl?: string    // 参照動画URL
  motionStrength?: number    // 0.0-1.0
  duration?: KlingDuration
  aspectRatio?: KlingAspectRatio
  quality?: KlingQuality
  modelVersion?: KlingModelVersion
}

// カメラ制御リクエスト
export interface KlingCameraControlRequest {
  imageUrl: string           // ソース画像
  prompt: string             // プロンプト
  cameraPresetId?: string    // カメラプリセットID
  cameraReferenceVideoUrl?: string // 参照動画URL
  cameraControls?: CameraControl[] // 手動カメラ制御
  duration?: KlingDuration
  aspectRatio?: KlingAspectRatio
  quality?: KlingQuality
  modelVersion?: KlingModelVersion
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
