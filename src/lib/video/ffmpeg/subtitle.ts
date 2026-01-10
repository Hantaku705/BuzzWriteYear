import ffmpeg from 'fluent-ffmpeg'
import path from 'path'
import fs from 'fs'
import os from 'os'

export interface SubtitleEntry {
  startTime: number // 秒
  endTime: number // 秒
  text: string
}

export interface SubtitleStyle {
  fontName?: string
  fontSize?: number
  fontColor?: string // hex or name
  outlineColor?: string
  outlineWidth?: number
  backgroundColor?: string
  backgroundOpacity?: number
  position?: 'top' | 'center' | 'bottom'
  marginV?: number // 垂直マージン
}

export interface BurnSubtitleOptions {
  inputPath: string
  outputPath: string
  subtitles: SubtitleEntry[]
  style?: SubtitleStyle
}

export interface TextOverlayOptions {
  inputPath: string
  outputPath: string
  text: string
  startTime?: number
  endTime?: number
  style?: SubtitleStyle
}

export interface BurnSubtitleResult {
  outputPath: string
  subtitleCount: number
}

const DEFAULT_STYLE: SubtitleStyle = {
  fontName: 'Noto Sans CJK JP',
  fontSize: 24,
  fontColor: 'white',
  outlineColor: 'black',
  outlineWidth: 2,
  position: 'bottom',
  marginV: 30,
}

/**
 * SRTフォーマットの字幕ファイルを生成
 */
const generateSRT = (subtitles: SubtitleEntry[]): string => {
  return subtitles
    .map((sub, index) => {
      const startTime = formatSRTTime(sub.startTime)
      const endTime = formatSRTTime(sub.endTime)
      return `${index + 1}\n${startTime} --> ${endTime}\n${sub.text}\n`
    })
    .join('\n')
}

/**
 * 秒数をSRT時間形式に変換
 */
const formatSRTTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.round((seconds % 1) * 1000)
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`
}

/**
 * ASS形式のスタイル文字列を生成
 */
const generateASSStyle = (style: SubtitleStyle): string => {
  const s = { ...DEFAULT_STYLE, ...style }

  // 位置のAlignment設定（ASS形式）
  // 1-3: bottom, 4-6: middle, 7-9: top
  // 2: bottom-center, 5: middle-center, 8: top-center
  let alignment = 2
  if (s.position === 'top') alignment = 8
  else if (s.position === 'center') alignment = 5

  // 色をASS形式（&HBBGGRR）に変換
  const fontColorASS = colorToASS(s.fontColor || 'white')
  const outlineColorASS = colorToASS(s.outlineColor || 'black')

  return `force_style='FontName=${s.fontName},FontSize=${s.fontSize},PrimaryColour=${fontColorASS},OutlineColour=${outlineColorASS},Outline=${s.outlineWidth},Alignment=${alignment},MarginV=${s.marginV}'`
}

/**
 * 色名またはhexをASS形式に変換
 */
const colorToASS = (color: string): string => {
  const colorMap: Record<string, string> = {
    white: '&H00FFFFFF',
    black: '&H00000000',
    red: '&H000000FF',
    green: '&H0000FF00',
    blue: '&H00FF0000',
    yellow: '&H0000FFFF',
  }

  if (colorMap[color.toLowerCase()]) {
    return colorMap[color.toLowerCase()]
  }

  // hex形式の場合
  if (color.startsWith('#')) {
    const hex = color.slice(1)
    if (hex.length === 6) {
      // RGB -> BGR
      const r = hex.slice(0, 2)
      const g = hex.slice(2, 4)
      const b = hex.slice(4, 6)
      return `&H00${b}${g}${r}`
    }
  }

  return '&H00FFFFFF' // デフォルト: 白
}

/**
 * 字幕を動画に焼き込み
 */
export const burnSubtitles = (
  options: BurnSubtitleOptions
): Promise<BurnSubtitleResult> => {
  return new Promise((resolve, reject) => {
    const { inputPath, outputPath, subtitles, style = {} } = options

    if (!fs.existsSync(inputPath)) {
      reject(new Error(`Input file not found: ${inputPath}`))
      return
    }

    if (subtitles.length === 0) {
      reject(new Error('No subtitles provided'))
      return
    }

    const outputDir = path.dirname(outputPath)
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    // SRTファイルを一時作成
    const srtContent = generateSRT(subtitles)
    const srtPath = path.join(os.tmpdir(), `subtitle_${Date.now()}.srt`)
    fs.writeFileSync(srtPath, srtContent, 'utf-8')

    // スタイル設定
    const styleString = generateASSStyle(style)

    ffmpeg(inputPath)
      .videoFilters([
        `subtitles=${srtPath.replace(/:/g, '\\:').replace(/\\/g, '/')}:${styleString}`,
      ])
      .outputOptions([
        '-c:v libx264',
        '-preset fast',
        '-crf 23',
        '-c:a aac',
        '-b:a 128k',
      ])
      .on('end', () => {
        // クリーンアップ
        fs.unlinkSync(srtPath)
        resolve({
          outputPath,
          subtitleCount: subtitles.length,
        })
      })
      .on('error', (err) => {
        fs.unlinkSync(srtPath)
        console.error('[Subtitle] Error:', err.message)
        reject(err)
      })
      .save(outputPath)
  })
}

/**
 * 単一テキストオーバーレイ（drawtextフィルター使用）
 */
export const addTextOverlay = (
  options: TextOverlayOptions
): Promise<BurnSubtitleResult> => {
  return new Promise((resolve, reject) => {
    const {
      inputPath,
      outputPath,
      text,
      startTime = 0,
      endTime,
      style = {},
    } = options

    if (!fs.existsSync(inputPath)) {
      reject(new Error(`Input file not found: ${inputPath}`))
      return
    }

    const outputDir = path.dirname(outputPath)
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    const s = { ...DEFAULT_STYLE, ...style }

    // 位置計算
    let yPosition = '(h-text_h-30)' // bottom
    if (s.position === 'top') yPosition = '30'
    else if (s.position === 'center') yPosition = '(h-text_h)/2'

    // drawtextフィルター
    let drawtext = `drawtext=text='${text.replace(/'/g, "\\'")}':fontsize=${s.fontSize}:fontcolor=${s.fontColor}:borderw=${s.outlineWidth}:bordercolor=${s.outlineColor}:x=(w-text_w)/2:y=${yPosition}`

    // 表示時間の制限
    if (endTime) {
      drawtext += `:enable='between(t,${startTime},${endTime})'`
    } else if (startTime > 0) {
      drawtext += `:enable='gte(t,${startTime})'`
    }

    ffmpeg(inputPath)
      .videoFilters([drawtext])
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
          subtitleCount: 1,
        })
      })
      .on('error', (err) => {
        console.error('[TextOverlay] Error:', err.message)
        reject(err)
      })
      .save(outputPath)
  })
}

/**
 * 複数テキストオーバーレイ（時間指定付き）
 */
export const addMultipleTextOverlays = (
  inputPath: string,
  outputPath: string,
  overlays: Array<{
    text: string
    startTime: number
    endTime: number
    style?: SubtitleStyle
  }>
): Promise<BurnSubtitleResult> => {
  // SubtitleEntryに変換してburnSubtitlesを使用
  const subtitles: SubtitleEntry[] = overlays.map(o => ({
    startTime: o.startTime,
    endTime: o.endTime,
    text: o.text,
  }))

  return burnSubtitles({
    inputPath,
    outputPath,
    subtitles,
    style: overlays[0]?.style,
  })
}

/**
 * 商品紹介用のシンプルな字幕生成
 * テキストを均等に分割して表示
 */
export const generateProductSubtitles = (
  texts: string[],
  totalDuration: number,
  overlap: number = 0.2 // テキスト間のオーバーラップ秒数
): SubtitleEntry[] => {
  const duration = totalDuration / texts.length
  return texts.map((text, index) => ({
    text,
    startTime: index * duration - (index > 0 ? overlap : 0),
    endTime: (index + 1) * duration,
  }))
}
