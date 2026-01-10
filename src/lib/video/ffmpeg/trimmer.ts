import ffmpeg from 'fluent-ffmpeg'
import path from 'path'
import fs from 'fs'

export interface TrimOptions {
  inputPath: string
  outputPath: string
  startTime: number // 開始秒
  endTime?: number // 終了秒（省略時は最後まで）
  duration?: number // 長さ（endTimeの代わりに使用可能）
}

export interface TrimResult {
  outputPath: string
  duration: number
  startTime: number
  endTime: number
}

/**
 * 動画をトリミング（指定時間範囲を切り出し）
 */
export const trimVideo = (options: TrimOptions): Promise<TrimResult> => {
  return new Promise((resolve, reject) => {
    const { inputPath, outputPath, startTime, endTime, duration } = options

    if (!fs.existsSync(inputPath)) {
      reject(new Error(`Input file not found: ${inputPath}`))
      return
    }

    const outputDir = path.dirname(outputPath)
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    let command = ffmpeg(inputPath)
      .setStartTime(startTime)

    // 終了時間または長さを設定
    if (duration) {
      command = command.setDuration(duration)
    } else if (endTime) {
      command = command.setDuration(endTime - startTime)
    }

    command
      .outputOptions([
        '-c:v libx264',
        '-preset fast',
        '-crf 23',
        '-c:a aac',
        '-b:a 128k',
        '-avoid_negative_ts make_zero',
      ])
      .on('end', () => {
        const actualDuration = duration || (endTime ? endTime - startTime : 0)
        resolve({
          outputPath,
          duration: actualDuration,
          startTime,
          endTime: endTime || startTime + (duration || 0),
        })
      })
      .on('error', (err) => {
        console.error('[Trimmer] Error:', err.message)
        reject(err)
      })
      .save(outputPath)
  })
}

/**
 * 動画の先頭から指定秒数を切り出し
 */
export const extractFirstSeconds = (
  inputPath: string,
  outputPath: string,
  seconds: number
): Promise<TrimResult> => {
  return trimVideo({
    inputPath,
    outputPath,
    startTime: 0,
    duration: seconds,
  })
}

/**
 * 動画の末尾から指定秒数を切り出し
 */
export const extractLastSeconds = async (
  inputPath: string,
  outputPath: string,
  seconds: number
): Promise<TrimResult> => {
  // まず動画の長さを取得
  const metadata = await getVideoDuration(inputPath)
  const startTime = Math.max(0, metadata - seconds)

  return trimVideo({
    inputPath,
    outputPath,
    startTime,
    duration: seconds,
  })
}

/**
 * 動画の長さを取得
 */
export const getVideoDuration = (inputPath: string): Promise<number> => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) {
        reject(err)
        return
      }
      resolve(metadata.format.duration || 0)
    })
  })
}

/**
 * 動画のメタデータを取得
 */
export const getVideoMetadata = (inputPath: string): Promise<{
  duration: number
  width: number
  height: number
  fps: number
  codec: string
  bitrate: number
}> => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) {
        reject(err)
        return
      }

      const videoStream = metadata.streams.find(s => s.codec_type === 'video')
      const fps = videoStream?.r_frame_rate
        ? eval(videoStream.r_frame_rate)
        : 30

      resolve({
        duration: metadata.format.duration || 0,
        width: videoStream?.width || 0,
        height: videoStream?.height || 0,
        fps,
        codec: videoStream?.codec_name || 'unknown',
        bitrate: parseInt(String(metadata.format.bit_rate || 0)),
      })
    })
  })
}
