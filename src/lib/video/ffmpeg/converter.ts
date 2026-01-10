import ffmpeg from 'fluent-ffmpeg'
import path from 'path'
import fs from 'fs'

export type VideoCodec = 'h264' | 'h265' | 'vp9' | 'av1'
export type AudioCodec = 'aac' | 'opus' | 'mp3'
export type VideoPreset = 'ultrafast' | 'superfast' | 'veryfast' | 'faster' | 'fast' | 'medium' | 'slow' | 'slower' | 'veryslow'

export interface ConvertOptions {
  inputPath: string
  outputPath: string
  videoCodec?: VideoCodec
  audioCodec?: AudioCodec
  videoBitrate?: string // e.g., '2M', '4000k'
  audioBitrate?: string // e.g., '128k', '192k'
  crf?: number // 品質（0-51、低いほど高品質）
  preset?: VideoPreset
  fps?: number
  resolution?: { width: number; height: number }
  aspectRatio?: '9:16' | '16:9' | '1:1' | '4:5'
}

export interface ConvertResult {
  outputPath: string
  codec: string
  fileSize: number
  duration: number
}

// TikTok/Reels用のプリセット
export interface PlatformPreset {
  name: string
  width: number
  height: number
  fps: number
  videoBitrate: string
  audioBitrate: string
  codec: VideoCodec
}

export const PLATFORM_PRESETS: Record<string, PlatformPreset> = {
  tiktok: {
    name: 'TikTok',
    width: 1080,
    height: 1920,
    fps: 30,
    videoBitrate: '4M',
    audioBitrate: '128k',
    codec: 'h264',
  },
  instagram_reels: {
    name: 'Instagram Reels',
    width: 1080,
    height: 1920,
    fps: 30,
    videoBitrate: '3.5M',
    audioBitrate: '128k',
    codec: 'h264',
  },
  youtube_shorts: {
    name: 'YouTube Shorts',
    width: 1080,
    height: 1920,
    fps: 60,
    videoBitrate: '5M',
    audioBitrate: '192k',
    codec: 'h264',
  },
  twitter: {
    name: 'Twitter/X',
    width: 1080,
    height: 1920,
    fps: 30,
    videoBitrate: '2.5M',
    audioBitrate: '128k',
    codec: 'h264',
  },
}

/**
 * コーデック名をFFmpegエンコーダー名に変換
 */
const getEncoder = (codec: VideoCodec): string => {
  switch (codec) {
    case 'h264':
      return 'libx264'
    case 'h265':
      return 'libx265'
    case 'vp9':
      return 'libvpx-vp9'
    case 'av1':
      return 'libaom-av1'
    default:
      return 'libx264'
  }
}

/**
 * オーディオコーデック名をFFmpegエンコーダー名に変換
 */
const getAudioEncoder = (codec: AudioCodec): string => {
  switch (codec) {
    case 'aac':
      return 'aac'
    case 'opus':
      return 'libopus'
    case 'mp3':
      return 'libmp3lame'
    default:
      return 'aac'
  }
}

/**
 * 動画をコーデック変換
 */
export const convertVideo = (options: ConvertOptions): Promise<ConvertResult> => {
  return new Promise((resolve, reject) => {
    const {
      inputPath,
      outputPath,
      videoCodec = 'h264',
      audioCodec = 'aac',
      videoBitrate,
      audioBitrate = '128k',
      crf = 23,
      preset = 'fast',
      fps,
      resolution,
    } = options

    if (!fs.existsSync(inputPath)) {
      reject(new Error(`Input file not found: ${inputPath}`))
      return
    }

    const outputDir = path.dirname(outputPath)
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    const outputOptions: string[] = [
      `-c:v ${getEncoder(videoCodec)}`,
      `-preset ${preset}`,
      `-c:a ${getAudioEncoder(audioCodec)}`,
      `-b:a ${audioBitrate}`,
    ]

    // ビットレートまたはCRF
    if (videoBitrate) {
      outputOptions.push(`-b:v ${videoBitrate}`)
    } else {
      outputOptions.push(`-crf ${crf}`)
    }

    // H.265固有の設定
    if (videoCodec === 'h265') {
      outputOptions.push('-tag:v hvc1') // Apple互換タグ
    }

    let command = ffmpeg(inputPath)

    // フィルター
    const videoFilters: string[] = []

    // 解像度変更
    if (resolution) {
      videoFilters.push(`scale=${resolution.width}:${resolution.height}:force_original_aspect_ratio=decrease`)
      videoFilters.push(`pad=${resolution.width}:${resolution.height}:(ow-iw)/2:(oh-ih)/2`)
    }

    // FPS変更
    if (fps) {
      videoFilters.push(`fps=${fps}`)
    }

    if (videoFilters.length > 0) {
      command = command.videoFilters(videoFilters)
    }

    let duration = 0

    command
      .outputOptions(outputOptions)
      .on('codecData', (data) => {
        const timeParts = data.duration.split(':')
        if (timeParts.length === 3) {
          duration =
            parseFloat(timeParts[0]) * 3600 +
            parseFloat(timeParts[1]) * 60 +
            parseFloat(timeParts[2])
        }
      })
      .on('progress', (progress) => {
        console.log(`[Converter] Progress: ${progress.percent?.toFixed(1)}%`)
      })
      .on('end', () => {
        const stats = fs.statSync(outputPath)
        resolve({
          outputPath,
          codec: videoCodec,
          fileSize: stats.size,
          duration,
        })
      })
      .on('error', (err) => {
        console.error('[Converter] Error:', err.message)
        reject(err)
      })
      .save(outputPath)
  })
}

/**
 * プラットフォーム向けに最適化
 */
export const convertForPlatform = (
  inputPath: string,
  outputPath: string,
  platform: keyof typeof PLATFORM_PRESETS
): Promise<ConvertResult> => {
  const preset = PLATFORM_PRESETS[platform]
  if (!preset) {
    return Promise.reject(new Error(`Unknown platform: ${platform}`))
  }

  return convertVideo({
    inputPath,
    outputPath,
    videoCodec: preset.codec,
    videoBitrate: preset.videoBitrate,
    audioBitrate: preset.audioBitrate,
    fps: preset.fps,
    resolution: { width: preset.width, height: preset.height },
    preset: 'fast',
  })
}

/**
 * H.265に変換（ファイルサイズ削減）
 */
export const convertToH265 = (
  inputPath: string,
  outputPath: string,
  crf: number = 28
): Promise<ConvertResult> => {
  return convertVideo({
    inputPath,
    outputPath,
    videoCodec: 'h265',
    crf,
    preset: 'medium',
  })
}

/**
 * 縦型動画（9:16）に変換
 */
export const convertToVertical = (
  inputPath: string,
  outputPath: string
): Promise<ConvertResult> => {
  return convertVideo({
    inputPath,
    outputPath,
    resolution: { width: 1080, height: 1920 },
    fps: 30,
    preset: 'fast',
  })
}

/**
 * 横型動画（16:9）に変換
 */
export const convertToHorizontal = (
  inputPath: string,
  outputPath: string
): Promise<ConvertResult> => {
  return convertVideo({
    inputPath,
    outputPath,
    resolution: { width: 1920, height: 1080 },
    fps: 30,
    preset: 'fast',
  })
}

/**
 * 正方形動画（1:1）に変換
 */
export const convertToSquare = (
  inputPath: string,
  outputPath: string
): Promise<ConvertResult> => {
  return convertVideo({
    inputPath,
    outputPath,
    resolution: { width: 1080, height: 1080 },
    fps: 30,
    preset: 'fast',
  })
}

/**
 * 動画を圧縮（品質を落としてファイルサイズ削減）
 */
export const compressVideo = (
  inputPath: string,
  outputPath: string,
  targetSizeMB?: number
): Promise<ConvertResult> => {
  // targetSizeMBが指定された場合、ビットレートを計算
  // 省略時はCRF 28で圧縮
  return convertVideo({
    inputPath,
    outputPath,
    crf: 28,
    preset: 'slow', // 圧縮効率優先
    audioCodec: 'aac',
    audioBitrate: '96k',
  })
}

/**
 * 音声を抽出
 */
export const extractAudio = (
  inputPath: string,
  outputPath: string,
  format: 'mp3' | 'aac' | 'm4a' = 'mp3'
): Promise<{ outputPath: string; duration: number }> => {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(inputPath)) {
      reject(new Error(`Input file not found: ${inputPath}`))
      return
    }

    const outputDir = path.dirname(outputPath)
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    let codec = 'libmp3lame'
    if (format === 'aac' || format === 'm4a') {
      codec = 'aac'
    }

    let duration = 0

    ffmpeg(inputPath)
      .noVideo()
      .audioCodec(codec)
      .audioBitrate('192k')
      .on('codecData', (data) => {
        const timeParts = data.duration.split(':')
        if (timeParts.length === 3) {
          duration =
            parseFloat(timeParts[0]) * 3600 +
            parseFloat(timeParts[1]) * 60 +
            parseFloat(timeParts[2])
        }
      })
      .on('end', () => {
        resolve({ outputPath, duration })
      })
      .on('error', (err) => {
        console.error('[ExtractAudio] Error:', err.message)
        reject(err)
      })
      .save(outputPath)
  })
}
