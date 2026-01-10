/**
 * HeyGen API Client
 * ドキュメント: https://docs.heygen.com/reference
 */

const HEYGEN_API_BASE = 'https://api.heygen.com/v2'

// HeyGen API Key
const getApiKey = () => {
  const apiKey = process.env.HEYGEN_API_KEY
  if (!apiKey) {
    throw new Error('HEYGEN_API_KEY environment variable is not set')
  }
  return apiKey
}

// API Request Helper
async function heygenRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const apiKey = getApiKey()

  const response = await fetch(`${HEYGEN_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(
      `HeyGen API error: ${response.status} - ${JSON.stringify(errorData)}`
    )
  }

  return response.json()
}

// 型定義
export interface Avatar {
  avatar_id: string
  avatar_name: string
  preview_image_url: string
  preview_video_url: string
}

export interface Voice {
  voice_id: string
  name: string
  language: string
  gender: string
  preview_audio: string
}

export interface VideoGenerationRequest {
  avatar_id: string
  script: string
  voice_id?: string
  background?: {
    type: 'color' | 'image' | 'video'
    value: string
  }
  dimension?: {
    width: number
    height: number
  }
}

export interface VideoGenerationResponse {
  video_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
}

export interface VideoStatusResponse {
  video_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  video_url?: string
  thumbnail_url?: string
  duration?: number
  error?: string
}

// アバター一覧取得
export async function listAvatars(): Promise<Avatar[]> {
  const response = await heygenRequest<{ data: { avatars: Avatar[] } }>(
    '/avatars'
  )
  return response.data.avatars
}

// ボイス一覧取得
export async function listVoices(): Promise<Voice[]> {
  const response = await heygenRequest<{ data: { voices: Voice[] } }>(
    '/voices'
  )
  return response.data.voices
}

// 動画生成開始
export async function generateVideo(
  request: VideoGenerationRequest
): Promise<VideoGenerationResponse> {
  const payload = {
    video_inputs: [
      {
        character: {
          type: 'avatar',
          avatar_id: request.avatar_id,
          avatar_style: 'normal',
        },
        voice: request.voice_id
          ? {
              type: 'text',
              input_text: request.script,
              voice_id: request.voice_id,
            }
          : undefined,
        background: request.background || {
          type: 'color',
          value: '#000000',
        },
      },
    ],
    dimension: request.dimension || {
      width: 1080,
      height: 1920, // TikTok縦型
    },
  }

  const response = await heygenRequest<{ data: VideoGenerationResponse }>(
    '/video/generate',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  )

  return response.data
}

// 動画ステータス確認
export async function getVideoStatus(
  videoId: string
): Promise<VideoStatusResponse> {
  const response = await heygenRequest<{ data: VideoStatusResponse }>(
    `/video_status.get?video_id=${videoId}`
  )
  return response.data
}

// 動画完了まで待機（ポーリング）
export async function waitForVideoCompletion(
  videoId: string,
  options: {
    maxAttempts?: number
    pollInterval?: number
    onProgress?: (status: VideoStatusResponse) => void
  } = {}
): Promise<VideoStatusResponse> {
  const {
    maxAttempts = 60,
    pollInterval = 10000,
    onProgress,
  } = options

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const status = await getVideoStatus(videoId)

    if (onProgress) {
      onProgress(status)
    }

    if (status.status === 'completed') {
      return status
    }

    if (status.status === 'failed') {
      throw new Error(`HeyGen video generation failed: ${status.error}`)
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval))
  }

  throw new Error('HeyGen video generation timed out')
}

// 動画ダウンロード
export async function downloadVideo(
  videoUrl: string,
  outputPath: string
): Promise<void> {
  const response = await fetch(videoUrl)

  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.status}`)
  }

  const fs = await import('fs')
  const { Readable } = await import('stream')
  const { finished } = await import('stream/promises')

  const fileStream = fs.createWriteStream(outputPath)
  // @ts-expect-error ReadableStream type compatibility
  await finished(Readable.fromWeb(response.body).pipe(fileStream))
}
