import ffmpeg from 'fluent-ffmpeg'
import path from 'path'
import fs from 'fs'
import os from 'os'

export interface MergeOptions {
  inputPaths: string[]
  outputPath: string
  transition?: 'none' | 'fade' | 'dissolve'
  transitionDuration?: number // トランジション秒数
  normalizeAudio?: boolean
}

export interface MergeResult {
  outputPath: string
  totalDuration: number
  videoCount: number
}

/**
 * 複数動画を結合（concat）
 */
export const mergeVideos = (options: MergeOptions): Promise<MergeResult> => {
  return new Promise((resolve, reject) => {
    const {
      inputPaths,
      outputPath,
      transition = 'none',
      transitionDuration = 0.5,
      normalizeAudio = true,
    } = options

    if (inputPaths.length === 0) {
      reject(new Error('No input files provided'))
      return
    }

    // すべてのファイルが存在するか確認
    for (const inputPath of inputPaths) {
      if (!fs.existsSync(inputPath)) {
        reject(new Error(`Input file not found: ${inputPath}`))
        return
      }
    }

    const outputDir = path.dirname(outputPath)
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    if (transition === 'none') {
      // シンプルなconcat（concatプロトコル使用）
      mergeWithConcat(inputPaths, outputPath, normalizeAudio)
        .then(resolve)
        .catch(reject)
    } else {
      // トランジション付き結合（filter_complex使用）
      mergeWithTransition(inputPaths, outputPath, transition, transitionDuration)
        .then(resolve)
        .catch(reject)
    }
  })
}

/**
 * シンプルなconcat結合
 */
const mergeWithConcat = (
  inputPaths: string[],
  outputPath: string,
  normalizeAudio: boolean
): Promise<MergeResult> => {
  return new Promise((resolve, reject) => {
    // concatリストファイルを作成
    const listContent = inputPaths
      .map(p => `file '${p.replace(/'/g, "'\\''")}'`)
      .join('\n')
    const listPath = path.join(os.tmpdir(), `concat_${Date.now()}.txt`)
    fs.writeFileSync(listPath, listContent)

    const outputOptions = [
      '-c:v libx264',
      '-preset fast',
      '-crf 23',
      '-c:a aac',
      '-b:a 128k',
    ]

    if (normalizeAudio) {
      outputOptions.push('-af', 'loudnorm=I=-16:TP=-1.5:LRA=11')
    }

    ffmpeg()
      .input(listPath)
      .inputOptions(['-f', 'concat', '-safe', '0'])
      .outputOptions(outputOptions)
      .on('end', () => {
        // クリーンアップ
        fs.unlinkSync(listPath)
        resolve({
          outputPath,
          totalDuration: 0, // 後で計算可能
          videoCount: inputPaths.length,
        })
      })
      .on('error', (err) => {
        fs.unlinkSync(listPath)
        console.error('[Merger] Error:', err.message)
        reject(err)
      })
      .save(outputPath)
  })
}

/**
 * トランジション付き結合（最大4-5動画推奨）
 */
const mergeWithTransition = (
  inputPaths: string[],
  outputPath: string,
  transition: 'fade' | 'dissolve',
  transitionDuration: number
): Promise<MergeResult> => {
  return new Promise((resolve, reject) => {
    if (inputPaths.length > 5) {
      reject(new Error('Transition merge supports up to 5 videos'))
      return
    }

    let command = ffmpeg()

    // すべての入力を追加
    for (const inputPath of inputPaths) {
      command = command.input(inputPath)
    }

    // filter_complexを構築
    const filterParts: string[] = []
    const videoCount = inputPaths.length

    // 各入力を正規化
    for (let i = 0; i < videoCount; i++) {
      filterParts.push(
        `[${i}:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[v${i}]`
      )
      filterParts.push(
        `[${i}:a]aformat=sample_rates=44100:channel_layouts=stereo[a${i}]`
      )
    }

    // トランジションを適用
    if (transition === 'fade' || transition === 'dissolve') {
      let currentVideo = 'v0'
      let currentAudio = 'a0'

      for (let i = 1; i < videoCount; i++) {
        const nextVideo = `v${i}`
        const nextAudio = `a${i}`
        const outputVideo = i === videoCount - 1 ? 'vout' : `vt${i}`
        const outputAudio = i === videoCount - 1 ? 'aout' : `at${i}`

        // xfade（クロスフェード）を使用
        filterParts.push(
          `[${currentVideo}][${nextVideo}]xfade=transition=${transition}:duration=${transitionDuration}:offset=auto[${outputVideo}]`
        )
        // acrossfade（オーディオクロスフェード）
        filterParts.push(
          `[${currentAudio}][${nextAudio}]acrossfade=d=${transitionDuration}[${outputAudio}]`
        )

        currentVideo = outputVideo
        currentAudio = outputAudio
      }
    } else {
      // トランジションなしの場合はシンプルにconcat
      const videoInputs = Array.from({ length: videoCount }, (_, i) => `[v${i}]`).join('')
      const audioInputs = Array.from({ length: videoCount }, (_, i) => `[a${i}]`).join('')
      filterParts.push(`${videoInputs}concat=n=${videoCount}:v=1:a=0[vout]`)
      filterParts.push(`${audioInputs}concat=n=${videoCount}:v=0:a=1[aout]`)
    }

    const filterComplex = filterParts.join(';')

    command
      .complexFilter(filterComplex, ['vout', 'aout'])
      .outputOptions([
        '-c:v libx264',
        '-preset fast',
        '-crf 23',
        '-c:a aac',
        '-b:a 128k',
      ])
      .on('end', () => {
        resolve({
          outputPath,
          totalDuration: 0,
          videoCount: inputPaths.length,
        })
      })
      .on('error', (err) => {
        console.error('[Merger] Transition error:', err.message)
        reject(err)
      })
      .save(outputPath)
  })
}

/**
 * 2つの動画をシンプルに結合
 */
export const concatTwo = (
  inputPath1: string,
  inputPath2: string,
  outputPath: string
): Promise<MergeResult> => {
  return mergeVideos({
    inputPaths: [inputPath1, inputPath2],
    outputPath,
    transition: 'none',
  })
}

/**
 * フェードイン・フェードアウト付きで結合
 */
export const mergeWithFade = (
  inputPaths: string[],
  outputPath: string,
  fadeDuration: number = 0.5
): Promise<MergeResult> => {
  return mergeVideos({
    inputPaths,
    outputPath,
    transition: 'fade',
    transitionDuration: fadeDuration,
  })
}
