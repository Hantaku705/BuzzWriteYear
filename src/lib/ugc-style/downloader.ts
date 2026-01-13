/**
 * 動画ダウンローダー
 * TikTok URL、直接URLからの動画取得
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/** 入力タイプ */
export type VideoInputType = 'tiktok' | 'url' | 'upload'

/** 入力検出結果 */
export interface VideoInputDetection {
  type: VideoInputType
  originalUrl: string
  filename?: string
}

/**
 * URLの種類を判定
 */
export function detectInputType(input: string): VideoInputDetection {
  const url = input.trim()

  // TikTok URL
  if (url.includes('tiktok.com') || url.includes('vm.tiktok.com')) {
    return { type: 'tiktok', originalUrl: url }
  }

  // 直接URLの動画ファイル
  if (url.match(/\.(mp4|mov|webm|avi)(\?.*)?$/i) || url.includes('storage')) {
    const filename = url.split('/').pop()?.split('?')[0] || 'video.mp4'
    return { type: 'url', originalUrl: url, filename }
  }

  // その他のURL（動画ホスティングサービス等）
  return { type: 'url', originalUrl: url }
}

/**
 * TikTok動画をダウンロード（サードパーティAPI使用）
 * 注意: 実際の本番環境では適切なAPIを使用してください
 */
export async function downloadTikTokVideo(tiktokUrl: string): Promise<{
  videoUrl: string
  duration?: number
}> {
  // TikTok APIまたはサードパーティサービスを使用
  // ここではtiktokpyやrapidapi等のサービスを使うことを想定

  // オプション1: RapidAPI (TikTok Video Downloader)
  const rapidApiKey = process.env.RAPIDAPI_KEY
  if (rapidApiKey) {
    try {
      const response = await fetch(
        `https://tiktok-video-downloader2.p.rapidapi.com/video?url=${encodeURIComponent(tiktokUrl)}`,
        {
          headers: {
            'X-RapidAPI-Key': rapidApiKey,
            'X-RapidAPI-Host': 'tiktok-video-downloader2.p.rapidapi.com',
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        if (data.video_url) {
          return { videoUrl: data.video_url, duration: data.duration }
        }
      }
    } catch (error) {
      console.warn('RapidAPI TikTok download failed:', error)
    }
  }

  // オプション2: 直接ダウンロード試行（一部のURLで機能）
  // TikTokのモバイルURLからビデオURLを取得
  try {
    const response = await fetch(tiktokUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
      },
      redirect: 'follow',
    })

    const html = await response.text()

    // ビデオURLをHTMLから抽出（JSONデータ内）
    const videoUrlMatch = html.match(/"playAddr":"([^"]+)"/)
    if (videoUrlMatch) {
      const videoUrl = videoUrlMatch[1].replace(/\\u002F/g, '/')
      return { videoUrl }
    }

    const downloadUrlMatch = html.match(/"downloadAddr":"([^"]+)"/)
    if (downloadUrlMatch) {
      const videoUrl = downloadUrlMatch[1].replace(/\\u002F/g, '/')
      return { videoUrl }
    }
  } catch (error) {
    console.warn('Direct TikTok download failed:', error)
  }

  throw new Error(
    'TikTok動画のダウンロードに失敗しました。URLを確認するか、動画ファイルを直接アップロードしてください。'
  )
}

/**
 * URLから動画をダウンロードしてSupabase Storageにアップロード
 */
export async function downloadAndUploadVideo(
  videoUrl: string,
  userId: string,
  styleId: string,
  filename?: string
): Promise<{
  storageUrl: string
  filename: string
  fileSize: number
}> {
  // 動画をダウンロード
  const response = await fetch(videoUrl)
  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.status}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // ファイル名を決定
  const finalFilename = filename || `sample_${Date.now()}.mp4`
  const storagePath = `ugc-styles/${userId}/${styleId}/${finalFilename}`

  // Supabase Storageにアップロード
  const { error: uploadError } = await supabase.storage
    .from('videos')
    .upload(storagePath, buffer, {
      contentType: 'video/mp4',
      upsert: true,
    })

  if (uploadError) {
    throw new Error(`Failed to upload video: ${uploadError.message}`)
  }

  // 公開URLを取得
  const { data: urlData } = supabase.storage
    .from('videos')
    .getPublicUrl(storagePath)

  return {
    storageUrl: urlData.publicUrl,
    filename: finalFilename,
    fileSize: buffer.length,
  }
}

/**
 * 複数の入力（TikTok URL、直接URL、アップロード済みURL）を処理
 */
export async function processVideoInputs(
  inputs: string[],
  userId: string,
  styleId: string
): Promise<Array<{
  originalInput: string
  storageUrl: string
  filename: string
  fileSize: number
  inputType: VideoInputType
}>> {
  const results: Array<{
    originalInput: string
    storageUrl: string
    filename: string
    fileSize: number
    inputType: VideoInputType
  }> = []

  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i]
    const detection = detectInputType(input)

    try {
      let videoUrl = detection.originalUrl

      // TikTok URLの場合は動画URLを取得
      if (detection.type === 'tiktok') {
        const tiktokResult = await downloadTikTokVideo(input)
        videoUrl = tiktokResult.videoUrl
      }

      // 既にSupabase StorageのURLの場合はそのまま使用
      if (videoUrl.includes(process.env.NEXT_PUBLIC_SUPABASE_URL || '')) {
        results.push({
          originalInput: input,
          storageUrl: videoUrl,
          filename: detection.filename || `sample_${i + 1}.mp4`,
          fileSize: 0, // サイズは後で取得
          inputType: detection.type,
        })
        continue
      }

      // ダウンロードしてSupabase Storageにアップロード
      const uploaded = await downloadAndUploadVideo(
        videoUrl,
        userId,
        styleId,
        detection.filename || `sample_${i + 1}.mp4`
      )

      results.push({
        originalInput: input,
        storageUrl: uploaded.storageUrl,
        filename: uploaded.filename,
        fileSize: uploaded.fileSize,
        inputType: detection.type,
      })
    } catch (error) {
      console.error(`Failed to process input ${i + 1}:`, error)
      throw new Error(
        `動画 ${i + 1} の処理に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  return results
}
