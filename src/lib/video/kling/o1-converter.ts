/**
 * Kling O1 タブ別API変換ロジック
 *
 * 各タブのタグとプロンプトを適切なAPIエンドポイント用パラメータに変換
 */

import {
  type O1Tab,
  type TagItem,
  replaceMentionsWithContext,
} from './tags'
import type {
  KlingModelVersion,
  KlingAspectRatio,
  KlingQuality,
} from './constants'

// ============================================
// 型定義
// ============================================

export interface O1GenerationOptions {
  // 基本情報
  productId: string
  title: string

  // 生成パラメータ
  modelVersion: KlingModelVersion
  aspectRatio: KlingAspectRatio
  quality: KlingQuality
  duration: 5 | 10

  // タブ固有オプション
  sourceVideo?: string // プロンプト変換用
  referenceVideo?: string // 動画参考用
  startFrame?: string // フレーム用
  endFrame?: string // フレーム用
}

export interface O1ApiParams {
  endpoint: string
  body: Record<string, unknown>
}

// ============================================
// メイン変換関数
// ============================================

/**
 * O1タブの状態をAPI呼び出しパラメータに変換
 */
export function convertO1ToApiParams(
  tab: O1Tab,
  tags: TagItem[],
  prompt: string,
  options: O1GenerationOptions
): O1ApiParams {
  // @メンションを [type:name] 形式に変換
  const processedPrompt = replaceMentionsWithContext(prompt, tags)

  // 有効なタグのみフィルタ（URLがあるもの）
  const validTags = tags.filter((t) => t.sourceUrl)

  switch (tab) {
    case 'image-subject':
      return convertImageSubjectTab(validTags, processedPrompt, options)

    case 'prompt-transform':
      return convertPromptTransformTab(validTags, processedPrompt, options)

    case 'video-reference':
      return convertVideoReferenceTab(validTags, processedPrompt, options)

    case 'frames':
      return convertFramesTab(processedPrompt, options)

    default:
      throw new Error(`Unknown tab: ${tab}`)
  }
}

// ============================================
// タブ別変換関数
// ============================================

/**
 * 画像/主体参考タブ → Elements API
 */
function convertImageSubjectTab(
  tags: TagItem[],
  prompt: string,
  options: O1GenerationOptions
): O1ApiParams {
  // 画像タグを抽出
  const imageTags = tags.filter((t) => t.type === 'image')
  const subjectTags = tags.filter((t) => t.type === 'subject')

  // 全画像URLを収集（主体の場合はvariants含む）
  const elementImages: string[] = []

  // 通常画像
  imageTags.forEach((tag) => {
    if (tag.sourceUrl) {
      elementImages.push(tag.sourceUrl)
    }
  })

  // 主体画像（メイン + variants）
  subjectTags.forEach((tag) => {
    if (tag.sourceUrl) {
      elementImages.push(tag.sourceUrl)
    }
    if (tag.variants) {
      elementImages.push(...tag.variants)
    }
  })

  // 主体がある場合はプロンプトに説明を追加
  let enhancedPrompt = prompt
  subjectTags.forEach((tag) => {
    if (tag.description) {
      enhancedPrompt = `${tag.description}. ${enhancedPrompt}`
    }
  })

  return {
    endpoint: '/api/videos/kling/elements',
    body: {
      productId: options.productId,
      title: options.title,
      prompt: enhancedPrompt,
      negativePrompt: '',
      elementImages,
      duration: String(options.duration),
      aspectRatio: options.aspectRatio,
      quality: options.quality,
      modelVersion: options.modelVersion,
    },
  }
}

/**
 * プロンプト変換タブ → V2V Edit API
 */
function convertPromptTransformTab(
  tags: TagItem[],
  prompt: string,
  options: O1GenerationOptions
): O1ApiParams {
  if (!options.sourceVideo) {
    throw new Error('プロンプト変換には動画が必要です')
  }

  // 参照画像を収集
  const referenceImages = tags
    .filter((t) => t.type === 'image' || t.type === 'subject')
    .map((t) => t.sourceUrl)
    .filter(Boolean) as string[]

  return {
    endpoint: '/api/videos/kling/edit',
    body: {
      productId: options.productId,
      title: options.title,
      videoUrl: options.sourceVideo,
      prompt, // 編集指示
      referenceImages,
      modelVersion: options.modelVersion,
    },
  }
}

/**
 * 動画参考タブ → Motion Reference API
 */
function convertVideoReferenceTab(
  tags: TagItem[],
  prompt: string,
  options: O1GenerationOptions
): O1ApiParams {
  if (!options.referenceVideo) {
    throw new Error('動画参考には参照動画が必要です')
  }

  // メイン画像を取得（最初の画像タグ）
  const mainImage = tags.find((t) => t.type === 'image' || t.type === 'subject')

  return {
    endpoint: '/api/videos/kling/motion',
    body: {
      productId: options.productId,
      title: options.title,
      imageUrl: mainImage?.sourceUrl,
      prompt,
      motionVideoUrl: options.referenceVideo,
      duration: String(options.duration),
      aspectRatio: options.aspectRatio,
      quality: options.quality,
      modelVersion: options.modelVersion,
    },
  }
}

/**
 * フレームタブ → Dual Keyframe（通常のI2V API）
 */
function convertFramesTab(
  prompt: string,
  options: O1GenerationOptions
): O1ApiParams {
  if (!options.startFrame) {
    throw new Error('フレームにはスタート画像が必要です')
  }

  return {
    endpoint: '/api/videos/kling',
    body: {
      productId: options.productId,
      title: options.title,
      mode: 'image-to-video',
      imageUrl: options.startFrame,
      imageTailUrl: options.endFrame, // オプション（エンド画像）
      prompt,
      negativePrompt: '',
      duration: String(options.duration),
      aspectRatio: options.aspectRatio,
      quality: options.quality,
      modelVersion: options.modelVersion,
    },
  }
}

// ============================================
// バリデーション
// ============================================

export interface O1ValidationResult {
  valid: boolean
  error?: string
}

/**
 * O1生成前のバリデーション
 */
export function validateO1Generation(
  tab: O1Tab,
  tags: TagItem[],
  prompt: string,
  options: Partial<O1GenerationOptions>
): O1ValidationResult {
  // 共通バリデーション
  if (!options.productId) {
    return { valid: false, error: '商品を選択してください' }
  }

  // タブ別バリデーション
  switch (tab) {
    case 'image-subject':
      if (tags.filter((t) => t.sourceUrl).length === 0) {
        return { valid: false, error: '少なくとも1枚の画像を追加してください' }
      }
      break

    case 'prompt-transform':
      if (!options.sourceVideo) {
        return { valid: false, error: '編集する動画をアップロードしてください' }
      }
      if (!prompt.trim()) {
        return { valid: false, error: '編集指示を入力してください' }
      }
      break

    case 'video-reference':
      if (!options.referenceVideo) {
        return { valid: false, error: '参照動画をアップロードしてください' }
      }
      break

    case 'frames':
      if (!options.startFrame) {
        return { valid: false, error: 'スタート画像をアップロードしてください' }
      }
      break
  }

  return { valid: true }
}

// ============================================
// ユーティリティ
// ============================================

/**
 * タブの説明テキストを生成
 */
export function getO1TabSummary(
  tab: O1Tab,
  tags: TagItem[],
  options: Partial<O1GenerationOptions>
): string {
  const tagCount = tags.filter((t) => t.sourceUrl).length

  switch (tab) {
    case 'image-subject':
      return `${tagCount}枚の画像を組み合わせて動画生成`

    case 'prompt-transform':
      return options.sourceVideo
        ? `動画を自然言語で編集 (参照画像: ${tagCount}枚)`
        : '動画をアップロードして編集'

    case 'video-reference':
      return options.referenceVideo
        ? `参照動画のカメラワーク/動きを適用`
        : '参照動画をアップロード'

    case 'frames':
      const hasStart = !!options.startFrame
      const hasEnd = !!options.endFrame
      if (hasStart && hasEnd) {
        return 'スタート→エンドの変化を補間'
      } else if (hasStart) {
        return 'スタート画像から動画生成'
      }
      return 'スタート/エンド画像を設定'

    default:
      return ''
  }
}
