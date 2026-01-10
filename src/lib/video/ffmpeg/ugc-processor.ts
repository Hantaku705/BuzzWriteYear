import ffmpeg from 'fluent-ffmpeg'
import path from 'path'
import fs from 'fs'

// UGC加工エフェクトの種類
export type UGCEffect =
  | 'camera_shake'     // 手ブレ効果
  | 'film_grain'       // フィルムグレイン
  | 'vintage_filter'   // ヴィンテージ風
  | 'phone_quality'    // スマホ撮影風
  | 'selfie_mode'      // 自撮り風（左右反転+前カメラ感）

export interface UGCProcessingOptions {
  inputPath: string
  outputPath: string
  effects: UGCEffect[]
  intensity?: 'light' | 'medium' | 'heavy' // エフェクト強度
}

export interface UGCProcessingResult {
  outputPath: string
  duration: number
  appliedEffects: UGCEffect[]
}

// 各エフェクトのFFmpegフィルター生成
const getEffectFilters = (
  effect: UGCEffect,
  intensity: 'light' | 'medium' | 'heavy' = 'medium'
): string[] => {
  const intensityMap = {
    light: 0.3,
    medium: 0.6,
    heavy: 1.0,
  }
  const factor = intensityMap[intensity]

  switch (effect) {
    case 'camera_shake':
      // 手ブレ効果: ランダムな位置オフセット
      const shakeAmount = Math.round(5 * factor)
      return [
        `crop=in_w-${shakeAmount * 2}:in_h-${shakeAmount * 2}:${shakeAmount}+random(1)*${shakeAmount}:${shakeAmount}+random(1)*${shakeAmount}`,
        'scale=1080:1920',
      ]

    case 'film_grain':
      // フィルムグレイン: ノイズ追加
      const noiseAmount = Math.round(15 * factor)
      return [
        `noise=alls=${noiseAmount}:allf=t+u`,
      ]

    case 'vintage_filter':
      // ヴィンテージ風: 彩度下げ+セピア調+ビネット
      const saturation = 1 - (0.3 * factor)
      return [
        `eq=saturation=${saturation}:contrast=1.1`,
        `colorbalance=rs=0.1:gs=0.05:bs=-0.1`,
        `vignette=PI/${4 + (1 - factor) * 2}`,
      ]

    case 'phone_quality':
      // スマホ撮影風: 圧縮アーティファクト+わずかなブラー
      const blurAmount = 0.3 + (0.4 * factor)
      return [
        `gblur=sigma=${blurAmount}`,
        `unsharp=5:5:${0.5 * factor}:5:5:0`,
        'format=yuv420p',
      ]

    case 'selfie_mode':
      // 自撮り風: 左右反転+明るさアップ
      const brightness = 0.05 * factor
      return [
        'hflip',
        `eq=brightness=${brightness}:saturation=1.1`,
      ]

    default:
      return []
  }
}

// オーディオエフェクトのフィルター
const getAudioFilters = (
  effects: UGCEffect[],
  intensity: 'light' | 'medium' | 'heavy' = 'medium'
): string[] => {
  const filters: string[] = []
  const factor = { light: 0.3, medium: 0.6, heavy: 1.0 }[intensity]

  if (effects.includes('phone_quality')) {
    // スマホ風: 低音域カット+わずかな歪み
    filters.push(`highpass=f=${100 + 100 * factor}`)
    filters.push(`lowpass=f=${8000 - 2000 * factor}`)
  }

  if (effects.includes('vintage_filter')) {
    // ヴィンテージ風: テープヒス風ノイズ（軽め）
    // Note: FFmpegではシンプルな処理のみ
    filters.push(`volume=${1 - 0.05 * factor}`)
  }

  return filters
}

// UGC加工処理
export const processUGCVideo = (
  options: UGCProcessingOptions
): Promise<UGCProcessingResult> => {
  return new Promise((resolve, reject) => {
    const { inputPath, outputPath, effects, intensity = 'medium' } = options

    // 入力ファイル確認
    if (!fs.existsSync(inputPath)) {
      reject(new Error(`Input file not found: ${inputPath}`))
      return
    }

    // 出力ディレクトリ作成
    const outputDir = path.dirname(outputPath)
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    // ビデオフィルター生成
    const videoFilters = effects.flatMap(effect =>
      getEffectFilters(effect, intensity)
    )

    // オーディオフィルター生成
    const audioFilters = getAudioFilters(effects, intensity)

    // FFmpeg処理
    let command = ffmpeg(inputPath)
      .outputOptions([
        '-c:v libx264',
        '-preset fast',
        '-crf 23',
        '-c:a aac',
        '-b:a 128k',
      ])

    // ビデオフィルター適用
    if (videoFilters.length > 0) {
      command = command.videoFilters(videoFilters)
    }

    // オーディオフィルター適用
    if (audioFilters.length > 0) {
      command = command.audioFilters(audioFilters)
    }

    let duration = 0

    command
      .on('codecData', (data) => {
        // 動画時間を取得
        const timeParts = data.duration.split(':')
        if (timeParts.length === 3) {
          duration =
            parseFloat(timeParts[0]) * 3600 +
            parseFloat(timeParts[1]) * 60 +
            parseFloat(timeParts[2])
        }
      })
      .on('progress', (progress) => {
        console.log(`[UGC Processor] Processing: ${progress.percent?.toFixed(1)}%`)
      })
      .on('end', () => {
        console.log('[UGC Processor] Processing complete')
        resolve({
          outputPath,
          duration,
          appliedEffects: effects,
        })
      })
      .on('error', (err) => {
        console.error('[UGC Processor] Error:', err.message)
        reject(err)
      })
      .save(outputPath)
  })
}

// プリセット: TikTok向けUGC風
export const applyTikTokUGCPreset = (
  inputPath: string,
  outputPath: string
): Promise<UGCProcessingResult> => {
  return processUGCVideo({
    inputPath,
    outputPath,
    effects: ['camera_shake', 'phone_quality', 'film_grain'],
    intensity: 'light',
  })
}

// プリセット: レビュー風UGC
export const applyReviewUGCPreset = (
  inputPath: string,
  outputPath: string
): Promise<UGCProcessingResult> => {
  return processUGCVideo({
    inputPath,
    outputPath,
    effects: ['selfie_mode', 'phone_quality'],
    intensity: 'light',
  })
}

// プリセット: ヴィンテージ風UGC
export const applyVintageUGCPreset = (
  inputPath: string,
  outputPath: string
): Promise<UGCProcessingResult> => {
  return processUGCVideo({
    inputPath,
    outputPath,
    effects: ['vintage_filter', 'film_grain'],
    intensity: 'medium',
  })
}
