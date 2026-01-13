/**
 * UGCスタイル学習機能の型定義
 * JSON形式でエクスポート/インポート可能
 */

// ============================================
// スタイルプロファイル（分析結果）
// ============================================

/** カメラワーク分析結果 */
export interface CameraWorkProfile {
  /** 支配的なスタイル: handheld | tripod | gimbal | mixed */
  dominantStyle: 'handheld' | 'tripod' | 'gimbal' | 'mixed'
  /** 手ブレ強度: 0-1 */
  shakeIntensity: number
  /** ズーム使用度: 0-1 */
  zoomUsage: number
  /** パン使用度: 0-1 */
  panUsage: number
  /** よく使われる動き */
  commonMovements: string[]
}

/** 編集スタイル分析結果 */
export interface EditStyleProfile {
  /** テンポ: slow | medium | fast */
  pacing: 'slow' | 'medium' | 'fast'
  /** 平均クリップ長（秒） */
  avgClipDuration: number
  /** トランジション種類 */
  transitionTypes: string[]
  /** ジャンプカットの使用 */
  hasJumpCuts: boolean
  /** ビート同期 */
  beatSync: boolean
}

/** 視覚スタイル分析結果 */
export interface VisualStyleProfile {
  /** 色調: warm | cool | neutral */
  colorTone: 'warm' | 'cool' | 'neutral'
  /** フィルター感: vintage | modern | raw | cinematic */
  filterLook: 'vintage' | 'modern' | 'raw' | 'cinematic' | string
  /** コントラスト: low | medium | high */
  contrast: 'low' | 'medium' | 'high'
  /** 彩度: muted | natural | vibrant */
  saturation: 'muted' | 'natural' | 'vibrant'
  /** 支配的な色（HEXカラー） */
  dominantColors: string[]
}

/** モーションスタイル分析結果 */
export interface MotionStyleProfile {
  /** 動きの強度: subtle | moderate | dynamic */
  intensity: 'subtle' | 'moderate' | 'dynamic'
  /** 被写体の動き: static | subtle | active */
  subjectMovement: 'static' | 'subtle' | 'active'
  /** カメラの動き: rare | occasional | frequent */
  cameraMovement: 'rare' | 'occasional' | 'frequent'
}

/** 音声スタイル分析結果 */
export interface AudioStyleProfile {
  /** BGMの有無 */
  hasBGM: boolean
  /** ボイスオーバーの有無 */
  hasVoiceover: boolean
  /** 音楽ジャンル */
  musicGenre: string
  /** SEの使用度: none | light | moderate | heavy */
  sfxUsage: 'none' | 'light' | 'moderate' | 'heavy'
}

/** 統合されたスタイルプロファイル */
export interface StyleProfile {
  cameraWork: CameraWorkProfile
  editStyle: EditStyleProfile
  visualStyle: VisualStyleProfile
  motionStyle: MotionStyleProfile
  audioStyle: AudioStyleProfile
}

// ============================================
// 生成パラメータ（スタイルプロファイルから導出）
// ============================================

/** FFmpegエフェクト設定 */
export interface FFmpegEffectsConfig {
  /** 適用するエフェクト */
  effects: ('camera_shake' | 'film_grain' | 'vintage_filter' | 'phone_quality' | 'selfie_mode')[]
  /** 強度: light | medium | heavy */
  intensity: 'light' | 'medium' | 'heavy'
}

/** 動画生成パラメータ */
export interface GenerationParams {
  /** Klingプロンプトに追加するサフィックス */
  klingPromptSuffix: string
  /** Klingネガティブプロンプト */
  klingNegativePrompt: string
  /** マッピングされたモーションプリセットID */
  motionPresetId?: string
  /** マッピングされたカメラプリセットID */
  cameraPresetId?: string
  /** FFmpegポストプロセス設定 */
  ffmpegEffects: FFmpegEffectsConfig
}

// ============================================
// JSONエクスポート形式
// ============================================

/** UGCスタイルJSONエクスポート形式（v1.0） */
export interface UGCStyleExportJSON {
  /** フォーマットバージョン */
  version: '1.0'
  /** スタイル名 */
  name: string
  /** 説明 */
  description: string | null
  /** 作成日時（ISO 8601） */
  createdAt: string
  /** サンプル動画数 */
  sampleCount: number
  /** スタイルプロファイル */
  styleProfile: StyleProfile
  /** 生成パラメータ */
  generationParams: GenerationParams
  /** キーワード */
  keywords: string[]
  /** 全体の雰囲気 */
  overallVibe: string
}

// ============================================
// サンプル動画分析結果
// ============================================

/** 個別サンプル動画のカメラワーク分析 */
export interface SampleCameraWork {
  /** 検出された動き */
  movements: string[]
  /** 安定性: stable | handheld | shaky */
  stability: 'stable' | 'handheld' | 'shaky'
  /** フレーミング: closeup | medium | wide | mixed */
  framing: 'closeup' | 'medium' | 'wide' | 'mixed'
}

/** 個別サンプル動画の編集スタイル分析 */
export interface SampleEditStyle {
  /** テンポ */
  pacing: 'slow' | 'medium' | 'fast'
  /** 平均クリップ長 */
  avgClipDuration: number
  /** トランジション種類 */
  transitionTypes: string[]
  /** ジャンプカットの使用 */
  hasJumpCuts: boolean
}

/** 個別サンプル動画の視覚スタイル分析 */
export interface SampleVisualStyle {
  /** 支配的な色 */
  dominantColors: string[]
  /** コントラスト */
  contrast: 'low' | 'medium' | 'high'
  /** 彩度 */
  saturation: 'muted' | 'natural' | 'vibrant'
  /** フィルター感 */
  filterLook: string
}

/** 個別サンプル動画のモーションコンテンツ分析 */
export interface SampleMotionContent {
  /** 被写体タイプ */
  subjectType: 'product' | 'person' | 'both' | 'other'
  /** 動きの強度 */
  motionIntensity: 'subtle' | 'moderate' | 'dynamic'
  /** 主要なアクション */
  keyActions: string[]
}

/** 個別サンプル動画の音声分析 */
export interface SampleAudio {
  /** BGMの有無 */
  hasBGM: boolean
  /** ボイスオーバーの有無 */
  hasVoiceover: boolean
  /** 音楽ジャンル */
  musicGenre: string
}

/** 個別サンプル動画の分析結果 */
export interface SampleAnalysisResult {
  cameraWork: SampleCameraWork
  editStyle: SampleEditStyle
  visualStyle: SampleVisualStyle
  motionContent: SampleMotionContent
  audio: SampleAudio
  /** 全体の説明（自然言語） */
  overallDescription: string
}

// ============================================
// DBモデル
// ============================================

/** UGCスタイルのステータス */
export type UGCStyleStatus = 'analyzing' | 'ready' | 'failed'

/** サンプル動画の分析ステータス */
export type SampleAnalysisStatus = 'pending' | 'analyzing' | 'completed' | 'failed'

/** UGCスタイル（DBモデル） */
export interface UGCStyle {
  id: string
  user_id: string
  name: string
  description: string | null
  status: UGCStyleStatus
  sample_count: number
  style_profile: StyleProfile | Record<string, never>
  generation_params: GenerationParams | Record<string, never>
  keywords: string[]
  overall_vibe: string | null
  thumbnail_url: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

/** UGCスタイルサンプル（DBモデル） */
export interface UGCStyleSample {
  id: string
  ugc_style_id: string
  video_url: string
  filename: string | null
  duration_seconds: number | null
  file_size_bytes: number | null
  analysis_result: SampleAnalysisResult | Record<string, never>
  analysis_status: SampleAnalysisStatus
  error_message: string | null
  created_at: string
}

/** UGCスタイル + サンプル（リレーション込み） */
export interface UGCStyleWithSamples extends UGCStyle {
  samples: UGCStyleSample[]
}

// ============================================
// API リクエスト/レスポンス
// ============================================

/** スタイル作成リクエスト */
export interface CreateUGCStyleRequest {
  name: string
  description?: string
  /** アップロード済みの動画URL配列 */
  sampleUrls: string[]
}

/** スタイル更新リクエスト */
export interface UpdateUGCStyleRequest {
  name?: string
  description?: string
}

/** サンプル追加リクエスト */
export interface AddSamplesRequest {
  sampleUrls: string[]
}

/** スタイル作成レスポンス */
export interface CreateUGCStyleResponse {
  id: string
  status: UGCStyleStatus
  sampleCount: number
  /** 推定分析時間（秒） */
  estimatedTime: number
}

/** スタイル詳細レスポンス */
export interface UGCStyleDetailResponse extends UGCStyleWithSamples {
  /** 分析進捗（0-100） */
  progress: number
}

// ============================================
// ワーカージョブ
// ============================================

/** 分析ジョブのフェーズ */
export type AnalysisPhase = 'analyze-samples' | 'synthesize'

/** UGCスタイル分析ジョブデータ */
export interface UGCStyleAnalysisJobData {
  styleId: string
  userId: string
  sampleIds: string[]
  phase: AnalysisPhase
}

// ============================================
// デフォルト値
// ============================================

/** 空のスタイルプロファイル */
export const EMPTY_STYLE_PROFILE: StyleProfile = {
  cameraWork: {
    dominantStyle: 'handheld',
    shakeIntensity: 0,
    zoomUsage: 0,
    panUsage: 0,
    commonMovements: [],
  },
  editStyle: {
    pacing: 'medium',
    avgClipDuration: 3,
    transitionTypes: [],
    hasJumpCuts: false,
    beatSync: false,
  },
  visualStyle: {
    colorTone: 'neutral',
    filterLook: 'raw',
    contrast: 'medium',
    saturation: 'natural',
    dominantColors: [],
  },
  motionStyle: {
    intensity: 'moderate',
    subjectMovement: 'subtle',
    cameraMovement: 'occasional',
  },
  audioStyle: {
    hasBGM: false,
    hasVoiceover: false,
    musicGenre: '',
    sfxUsage: 'none',
  },
}

/** 空の生成パラメータ */
export const EMPTY_GENERATION_PARAMS: GenerationParams = {
  klingPromptSuffix: '',
  klingNegativePrompt: '',
  ffmpegEffects: {
    effects: [],
    intensity: 'light',
  },
}
