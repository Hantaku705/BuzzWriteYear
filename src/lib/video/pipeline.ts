import path from 'path'
import fs from 'fs'
import os from 'os'
import {
  processUGCVideo,
  UGCEffect,
  trimVideo,
  mergeVideos,
  burnSubtitles,
  SubtitleEntry,
  SubtitleStyle,
  convertForPlatform,
  compressVideo,
  getVideoMetadata,
  PLATFORM_PRESETS,
} from './ffmpeg'

export type PipelineStage =
  | 'init'
  | 'ugc_effects'
  | 'trim'
  | 'merge'
  | 'subtitles'
  | 'optimize'
  | 'thumbnail'
  | 'upload'
  | 'complete'
  | 'error'

export interface PipelineConfig {
  // 入力
  inputPath: string
  outputDir?: string

  // UGCエフェクト（オプション）
  ugcEffects?: {
    enabled: boolean
    effects: UGCEffect[]
    intensity?: 'light' | 'medium' | 'heavy'
  }

  // トリミング（オプション）
  trim?: {
    enabled: boolean
    startTime: number
    endTime?: number
    duration?: number
  }

  // 動画結合（オプション）
  merge?: {
    enabled: boolean
    additionalVideos: string[]
    transition?: 'none' | 'fade' | 'dissolve'
    transitionDuration?: number
  }

  // 字幕（オプション）
  subtitles?: {
    enabled: boolean
    entries: SubtitleEntry[]
    style?: SubtitleStyle
  }

  // プラットフォーム最適化
  optimize?: {
    enabled: boolean
    platform: 'tiktok' | 'instagram_reels' | 'youtube_shorts' | 'twitter'
  }

  // 圧縮（プラットフォーム最適化と排他）
  compress?: {
    enabled: boolean
  }

  // サムネイル生成
  thumbnail?: {
    enabled: boolean
    timeSeconds?: number // サムネイル取得時間
  }

  // コールバック
  onProgress?: (stage: PipelineStage, progress: number, message: string) => void
}

export interface PipelineResult {
  success: boolean
  outputPath: string
  thumbnailPath?: string
  metadata: {
    duration: number
    width: number
    height: number
    fileSize: number
    codec: string
  }
  stages: {
    stage: PipelineStage
    success: boolean
    duration: number
  }[]
  error?: string
}

/**
 * 動画処理パイプライン
 * Remotion出力 → UGCエフェクト → トリミング → 結合 → 字幕 → 最適化
 */
export async function runVideoPipeline(
  config: PipelineConfig
): Promise<PipelineResult> {
  const stages: PipelineResult['stages'] = []
  const startTime = Date.now()
  let currentPath = config.inputPath
  const tempFiles: string[] = []

  const outputDir = config.outputDir || os.tmpdir()
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const generateTempPath = (suffix: string) => {
    const tempPath = path.join(outputDir, `pipeline_${Date.now()}_${suffix}.mp4`)
    tempFiles.push(tempPath)
    return tempPath
  }

  const reportProgress = (stage: PipelineStage, progress: number, message: string) => {
    config.onProgress?.(stage, progress, message)
  }

  try {
    // 入力ファイル確認
    if (!fs.existsSync(config.inputPath)) {
      throw new Error(`Input file not found: ${config.inputPath}`)
    }

    reportProgress('init', 0, '処理を開始しています...')

    // Stage 1: UGCエフェクト
    if (config.ugcEffects?.enabled && config.ugcEffects.effects.length > 0) {
      const stageStart = Date.now()
      reportProgress('ugc_effects', 10, 'UGCエフェクトを適用中...')

      const outputPath = generateTempPath('ugc')
      await processUGCVideo({
        inputPath: currentPath,
        outputPath,
        effects: config.ugcEffects.effects,
        intensity: config.ugcEffects.intensity || 'medium',
      })

      currentPath = outputPath
      stages.push({
        stage: 'ugc_effects',
        success: true,
        duration: Date.now() - stageStart,
      })
    }

    // Stage 2: トリミング
    if (config.trim?.enabled) {
      const stageStart = Date.now()
      reportProgress('trim', 25, '動画をトリミング中...')

      const outputPath = generateTempPath('trim')
      await trimVideo({
        inputPath: currentPath,
        outputPath,
        startTime: config.trim.startTime,
        endTime: config.trim.endTime,
        duration: config.trim.duration,
      })

      currentPath = outputPath
      stages.push({
        stage: 'trim',
        success: true,
        duration: Date.now() - stageStart,
      })
    }

    // Stage 3: 動画結合
    if (config.merge?.enabled && config.merge.additionalVideos.length > 0) {
      const stageStart = Date.now()
      reportProgress('merge', 40, '動画を結合中...')

      const outputPath = generateTempPath('merge')
      await mergeVideos({
        inputPaths: [currentPath, ...config.merge.additionalVideos],
        outputPath,
        transition: config.merge.transition || 'none',
        transitionDuration: config.merge.transitionDuration,
      })

      currentPath = outputPath
      stages.push({
        stage: 'merge',
        success: true,
        duration: Date.now() - stageStart,
      })
    }

    // Stage 4: 字幕
    if (config.subtitles?.enabled && config.subtitles.entries.length > 0) {
      const stageStart = Date.now()
      reportProgress('subtitles', 55, '字幕を焼き込み中...')

      const outputPath = generateTempPath('subtitle')
      await burnSubtitles({
        inputPath: currentPath,
        outputPath,
        subtitles: config.subtitles.entries,
        style: config.subtitles.style,
      })

      currentPath = outputPath
      stages.push({
        stage: 'subtitles',
        success: true,
        duration: Date.now() - stageStart,
      })
    }

    // Stage 5: プラットフォーム最適化 or 圧縮
    if (config.optimize?.enabled) {
      const stageStart = Date.now()
      const platform = config.optimize.platform
      reportProgress('optimize', 70, `${PLATFORM_PRESETS[platform].name}向けに最適化中...`)

      const outputPath = generateTempPath('optimized')
      await convertForPlatform(currentPath, outputPath, platform)

      currentPath = outputPath
      stages.push({
        stage: 'optimize',
        success: true,
        duration: Date.now() - stageStart,
      })
    } else if (config.compress?.enabled) {
      const stageStart = Date.now()
      reportProgress('optimize', 70, '動画を圧縮中...')

      const outputPath = generateTempPath('compressed')
      await compressVideo(currentPath, outputPath)

      currentPath = outputPath
      stages.push({
        stage: 'optimize',
        success: true,
        duration: Date.now() - stageStart,
      })
    }

    // Stage 6: サムネイル生成
    let thumbnailPath: string | undefined
    if (config.thumbnail?.enabled) {
      const stageStart = Date.now()
      reportProgress('thumbnail', 85, 'サムネイルを生成中...')

      thumbnailPath = path.join(outputDir, `thumbnail_${Date.now()}.jpg`)
      await generateThumbnail(
        currentPath,
        thumbnailPath,
        config.thumbnail.timeSeconds || 1
      )

      stages.push({
        stage: 'thumbnail',
        success: true,
        duration: Date.now() - stageStart,
      })
    }

    // 最終出力パスを決定
    const finalOutputPath = path.join(outputDir, `final_${Date.now()}.mp4`)
    fs.copyFileSync(currentPath, finalOutputPath)

    // メタデータ取得
    const metadata = await getVideoMetadata(finalOutputPath)
    const stats = fs.statSync(finalOutputPath)

    reportProgress('complete', 100, '処理が完了しました')

    // 一時ファイルのクリーンアップ
    cleanupTempFiles(tempFiles)

    return {
      success: true,
      outputPath: finalOutputPath,
      thumbnailPath,
      metadata: {
        duration: metadata.duration,
        width: metadata.width,
        height: metadata.height,
        fileSize: stats.size,
        codec: metadata.codec,
      },
      stages,
    }
  } catch (error) {
    reportProgress('error', 0, `エラー: ${error instanceof Error ? error.message : 'Unknown error'}`)

    // クリーンアップ
    cleanupTempFiles(tempFiles)

    return {
      success: false,
      outputPath: '',
      metadata: {
        duration: 0,
        width: 0,
        height: 0,
        fileSize: 0,
        codec: '',
      },
      stages,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * サムネイル生成（FFmpegで特定フレームを抽出）
 */
async function generateThumbnail(
  inputPath: string,
  outputPath: string,
  timeSeconds: number
): Promise<void> {
  const ffmpeg = (await import('fluent-ffmpeg')).default

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .screenshots({
        timestamps: [timeSeconds],
        filename: path.basename(outputPath),
        folder: path.dirname(outputPath),
        size: '1080x1920',
      })
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
  })
}

/**
 * 一時ファイルのクリーンアップ
 */
function cleanupTempFiles(files: string[]): void {
  for (const file of files) {
    try {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file)
      }
    } catch (e) {
      console.warn(`Failed to cleanup temp file: ${file}`)
    }
  }
}

// プリセット設定

/**
 * TikTok向けUGC動画パイプライン
 */
export function createTikTokUGCPipeline(
  inputPath: string,
  subtitles?: SubtitleEntry[]
): PipelineConfig {
  return {
    inputPath,
    ugcEffects: {
      enabled: true,
      effects: ['camera_shake', 'phone_quality', 'film_grain'],
      intensity: 'light',
    },
    subtitles: subtitles
      ? {
          enabled: true,
          entries: subtitles,
          style: {
            fontSize: 28,
            fontColor: 'white',
            outlineColor: 'black',
            outlineWidth: 2,
            position: 'bottom',
          },
        }
      : undefined,
    optimize: {
      enabled: true,
      platform: 'tiktok',
    },
    thumbnail: {
      enabled: true,
      timeSeconds: 1,
    },
  }
}

/**
 * レビュー動画パイプライン
 */
export function createReviewPipeline(
  inputPath: string,
  subtitles?: SubtitleEntry[]
): PipelineConfig {
  return {
    inputPath,
    ugcEffects: {
      enabled: true,
      effects: ['selfie_mode', 'phone_quality'],
      intensity: 'light',
    },
    subtitles: subtitles
      ? {
          enabled: true,
          entries: subtitles,
          style: {
            fontSize: 24,
            fontColor: 'white',
            position: 'bottom',
          },
        }
      : undefined,
    optimize: {
      enabled: true,
      platform: 'tiktok',
    },
    thumbnail: {
      enabled: true,
    },
  }
}

/**
 * シンプル最適化パイプライン（エフェクトなし）
 */
export function createSimpleOptimizePipeline(
  inputPath: string,
  platform: 'tiktok' | 'instagram_reels' | 'youtube_shorts' = 'tiktok'
): PipelineConfig {
  return {
    inputPath,
    optimize: {
      enabled: true,
      platform,
    },
    thumbnail: {
      enabled: true,
    },
  }
}

/**
 * 複数動画結合パイプライン
 */
export function createMergePipeline(
  inputPaths: string[],
  platform: 'tiktok' | 'instagram_reels' | 'youtube_shorts' = 'tiktok'
): PipelineConfig {
  const [first, ...rest] = inputPaths
  return {
    inputPath: first,
    merge: {
      enabled: true,
      additionalVideos: rest,
      transition: 'fade',
      transitionDuration: 0.3,
    },
    optimize: {
      enabled: true,
      platform,
    },
    thumbnail: {
      enabled: true,
    },
  }
}
