import path from 'path'
import fs from 'fs'
import os from 'os'
import {
  runVideoPipeline,
  PipelineConfig,
} from './pipeline'
import {
  UGCEffect,
  SubtitleEntry,
  SubtitleStyle,
} from './ffmpeg'

export interface VariantConfig {
  name: string
  description?: string
  ugcEffects?: {
    effects: UGCEffect[]
    intensity: 'light' | 'medium' | 'heavy'
  }
  subtitles?: {
    entries: SubtitleEntry[]
    style?: SubtitleStyle
  }
  colorAdjustment?: {
    brightness?: number // -1.0 to 1.0
    contrast?: number // 0.0 to 2.0
    saturation?: number // 0.0 to 2.0
  }
  platform?: 'tiktok' | 'instagram_reels' | 'youtube_shorts' | 'twitter'
}

export interface VariantResult {
  name: string
  success: boolean
  outputPath?: string
  thumbnailPath?: string
  error?: string
  processingTime: number
}

export interface GenerateVariantsOptions {
  inputPath: string
  outputDir?: string
  variants: VariantConfig[]
  onProgress?: (variantIndex: number, variantName: string, progress: number) => void
}

export interface GenerateVariantsResult {
  success: boolean
  totalVariants: number
  successfulVariants: number
  results: VariantResult[]
  totalProcessingTime: number
}

// プリセットバリアント定義

/**
 * TikTok A/Bテスト用バリアントセット
 */
export const TIKTOK_AB_VARIANTS: VariantConfig[] = [
  {
    name: 'original',
    description: 'オリジナル（エフェクトなし）',
    platform: 'tiktok',
  },
  {
    name: 'ugc_light',
    description: 'UGC風（ライト）',
    ugcEffects: {
      effects: ['camera_shake', 'phone_quality'],
      intensity: 'light',
    },
    platform: 'tiktok',
  },
  {
    name: 'ugc_heavy',
    description: 'UGC風（ヘビー）',
    ugcEffects: {
      effects: ['camera_shake', 'film_grain', 'phone_quality'],
      intensity: 'heavy',
    },
    platform: 'tiktok',
  },
  {
    name: 'vintage',
    description: 'ヴィンテージ風',
    ugcEffects: {
      effects: ['vintage_filter', 'film_grain'],
      intensity: 'medium',
    },
    platform: 'tiktok',
  },
]

/**
 * 字幕テスト用バリアントセット
 */
export const SUBTITLE_TEST_VARIANTS = (
  subtitleTexts: string[],
  duration: number
): VariantConfig[] => {
  const baseInterval = duration / subtitleTexts.length

  return [
    {
      name: 'no_subtitle',
      description: '字幕なし',
      platform: 'tiktok',
    },
    {
      name: 'subtitle_bottom',
      description: '字幕（下部）',
      subtitles: {
        entries: subtitleTexts.map((text, i) => ({
          text,
          startTime: i * baseInterval,
          endTime: (i + 1) * baseInterval,
        })),
        style: {
          fontSize: 28,
          fontColor: 'white',
          outlineColor: 'black',
          outlineWidth: 2,
          position: 'bottom',
        },
      },
      platform: 'tiktok',
    },
    {
      name: 'subtitle_center',
      description: '字幕（中央）',
      subtitles: {
        entries: subtitleTexts.map((text, i) => ({
          text,
          startTime: i * baseInterval,
          endTime: (i + 1) * baseInterval,
        })),
        style: {
          fontSize: 32,
          fontColor: 'yellow',
          outlineColor: 'black',
          outlineWidth: 3,
          position: 'center',
        },
      },
      platform: 'tiktok',
    },
  ]
}

/**
 * マルチプラットフォームバリアントセット
 */
export const MULTI_PLATFORM_VARIANTS: VariantConfig[] = [
  {
    name: 'tiktok',
    description: 'TikTok最適化',
    platform: 'tiktok',
  },
  {
    name: 'instagram',
    description: 'Instagram Reels最適化',
    platform: 'instagram_reels',
  },
  {
    name: 'youtube',
    description: 'YouTube Shorts最適化',
    platform: 'youtube_shorts',
  },
  {
    name: 'twitter',
    description: 'Twitter/X最適化',
    platform: 'twitter',
  },
]

/**
 * フルテストバリアントセット（UGC + 字幕 + プラットフォーム）
 */
export const createFullTestVariants = (
  subtitleTexts?: string[],
  duration?: number
): VariantConfig[] => {
  const variants: VariantConfig[] = [
    // オリジナル
    {
      name: 'A_original',
      description: 'コントロール（オリジナル）',
      platform: 'tiktok',
    },
    // UGCライト
    {
      name: 'B_ugc_light',
      description: 'UGC風ライト',
      ugcEffects: {
        effects: ['camera_shake', 'phone_quality'],
        intensity: 'light',
      },
      platform: 'tiktok',
    },
    // UGCミディアム
    {
      name: 'C_ugc_medium',
      description: 'UGC風ミディアム',
      ugcEffects: {
        effects: ['camera_shake', 'film_grain', 'phone_quality'],
        intensity: 'medium',
      },
      platform: 'tiktok',
    },
  ]

  // 字幕付きバリアント
  if (subtitleTexts && duration) {
    const baseInterval = duration / subtitleTexts.length
    const subtitleEntries = subtitleTexts.map((text, i) => ({
      text,
      startTime: i * baseInterval,
      endTime: (i + 1) * baseInterval,
    }))

    variants.push({
      name: 'D_with_subtitle',
      description: 'オリジナル + 字幕',
      subtitles: {
        entries: subtitleEntries,
        style: {
          fontSize: 28,
          fontColor: 'white',
          position: 'bottom',
        },
      },
      platform: 'tiktok',
    })

    variants.push({
      name: 'E_ugc_subtitle',
      description: 'UGC + 字幕',
      ugcEffects: {
        effects: ['camera_shake', 'phone_quality'],
        intensity: 'light',
      },
      subtitles: {
        entries: subtitleEntries,
        style: {
          fontSize: 28,
          fontColor: 'white',
          position: 'bottom',
        },
      },
      platform: 'tiktok',
    })
  }

  return variants
}

/**
 * 複数バリアントを一括生成
 */
export async function generateVariants(
  options: GenerateVariantsOptions
): Promise<GenerateVariantsResult> {
  const { inputPath, variants, onProgress } = options
  const outputDir = options.outputDir || path.join(os.tmpdir(), `variants_${Date.now()}`)
  const startTime = Date.now()

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const results: VariantResult[] = []
  let successCount = 0

  for (let i = 0; i < variants.length; i++) {
    const variant = variants[i]
    const variantStart = Date.now()

    onProgress?.(i, variant.name, 0)

    try {
      // パイプライン設定を構築
      const config: PipelineConfig = {
        inputPath,
        outputDir: path.join(outputDir, variant.name),
        ugcEffects: variant.ugcEffects
          ? {
              enabled: true,
              effects: variant.ugcEffects.effects,
              intensity: variant.ugcEffects.intensity,
            }
          : undefined,
        subtitles: variant.subtitles
          ? {
              enabled: true,
              entries: variant.subtitles.entries,
              style: variant.subtitles.style,
            }
          : undefined,
        optimize: variant.platform
          ? {
              enabled: true,
              platform: variant.platform,
            }
          : undefined,
        thumbnail: {
          enabled: true,
          timeSeconds: 1,
        },
        onProgress: (stage, progress, message) => {
          onProgress?.(i, variant.name, progress)
        },
      }

      const result = await runVideoPipeline(config)

      if (result.success) {
        successCount++
        results.push({
          name: variant.name,
          success: true,
          outputPath: result.outputPath,
          thumbnailPath: result.thumbnailPath,
          processingTime: Date.now() - variantStart,
        })
      } else {
        results.push({
          name: variant.name,
          success: false,
          error: result.error,
          processingTime: Date.now() - variantStart,
        })
      }
    } catch (error) {
      results.push({
        name: variant.name,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - variantStart,
      })
    }

    onProgress?.(i, variant.name, 100)
  }

  return {
    success: successCount > 0,
    totalVariants: variants.length,
    successfulVariants: successCount,
    results,
    totalProcessingTime: Date.now() - startTime,
  }
}

/**
 * TikTok A/Bテスト用バリアントを生成
 */
export async function generateTikTokABVariants(
  inputPath: string,
  outputDir?: string,
  onProgress?: (variantIndex: number, variantName: string, progress: number) => void
): Promise<GenerateVariantsResult> {
  return generateVariants({
    inputPath,
    outputDir,
    variants: TIKTOK_AB_VARIANTS,
    onProgress,
  })
}

/**
 * マルチプラットフォームバリアントを生成
 */
export async function generateMultiPlatformVariants(
  inputPath: string,
  outputDir?: string,
  onProgress?: (variantIndex: number, variantName: string, progress: number) => void
): Promise<GenerateVariantsResult> {
  return generateVariants({
    inputPath,
    outputDir,
    variants: MULTI_PLATFORM_VARIANTS,
    onProgress,
  })
}

/**
 * フルテストバリアントを生成
 */
export async function generateFullTestVariants(
  inputPath: string,
  outputDir?: string,
  subtitleTexts?: string[],
  duration?: number,
  onProgress?: (variantIndex: number, variantName: string, progress: number) => void
): Promise<GenerateVariantsResult> {
  return generateVariants({
    inputPath,
    outputDir,
    variants: createFullTestVariants(subtitleTexts, duration),
    onProgress,
  })
}
