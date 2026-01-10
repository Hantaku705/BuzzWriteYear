/**
 * Kling AI API Client
 * Provider: PiAPI (https://piapi.ai/kling-api)
 *
 * 商品画像からWebCM風の高品質動画を生成
 */

const PIAPI_BASE_URL = 'https://api.piapi.ai'

// API Key
const getApiKey = () => {
  const apiKey = process.env.KLING_API_KEY
  if (!apiKey) {
    throw new Error('KLING_API_KEY environment variable is not set')
  }
  return apiKey
}

// API Request Helper
async function klingRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const apiKey = getApiKey()

  const response = await fetch(`${PIAPI_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(
      `Kling API error: ${response.status} - ${JSON.stringify(errorData)}`
    )
  }

  return response.json()
}

// 型定義
export type KlingMode = 'image-to-video' | 'text-to-video'
export type KlingDuration = 5 | 10
export type KlingModel = 'kling-v1' | 'kling-v1-5' | 'kling-v1-6' | 'kling-v2' | 'kling-v2-1'
export type KlingQuality = 'standard' | 'pro'

export interface KlingGenerationRequest {
  mode: KlingMode
  prompt: string
  imageUrl?: string // Image-to-Video時に必須
  duration?: KlingDuration
  model?: KlingModel
  quality?: KlingQuality
  aspectRatio?: '16:9' | '9:16' | '1:1'
  negativePrompt?: string
}

export interface KlingTaskResponse {
  task_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
}

export interface KlingTaskStatusResponse {
  task_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress?: number
  video_url?: string
  thumbnail_url?: string
  duration?: number
  error?: string
  created_at?: string
  completed_at?: string
}

// Image-to-Video 生成開始
export async function generateImageToVideo(
  request: Omit<KlingGenerationRequest, 'mode'> & { imageUrl: string }
): Promise<KlingTaskResponse> {
  const payload = {
    model: 'kling',
    task_type: 'video_generation',
    input: {
      image_url: request.imageUrl,
      prompt: request.prompt,
      negative_prompt: request.negativePrompt || '',
      duration: request.duration || 5,
      aspect_ratio: request.aspectRatio || '9:16',
      mode: request.quality === 'pro' ? 'pro' : 'std',
      version: '1.6',
    },
  }

  const response = await klingRequest<{ data: KlingTaskResponse }>(
    '/api/v1/task',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  )

  return response.data
}

// Text-to-Video 生成開始
export async function generateTextToVideo(
  request: Omit<KlingGenerationRequest, 'mode' | 'imageUrl'>
): Promise<KlingTaskResponse> {
  const payload = {
    model: 'kling',
    task_type: 'video_generation',
    input: {
      prompt: request.prompt,
      negative_prompt: request.negativePrompt || '',
      duration: request.duration || 5,
      aspect_ratio: request.aspectRatio || '9:16',
      mode: request.quality === 'pro' ? 'pro' : 'std',
      version: '1.6',
    },
  }

  const response = await klingRequest<{ data: KlingTaskResponse }>(
    '/api/v1/task',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  )

  return response.data
}

// タスクステータス確認
export async function getTaskStatus(
  taskId: string
): Promise<KlingTaskStatusResponse> {
  const response = await klingRequest<{ data: KlingTaskStatusResponse & { output?: { video_url?: string } } }>(
    `/api/v1/task/${taskId}`
  )

  const data = response.data
  // video_urlを複数の場所から取得
  if (!data.video_url && data.output?.video_url) {
    data.video_url = data.output.video_url
  }

  return data
}

// 動画完了まで待機（ポーリング）
export async function waitForCompletion(
  taskId: string,
  options: {
    maxAttempts?: number
    pollInterval?: number
    onProgress?: (status: KlingTaskStatusResponse) => void
  } = {}
): Promise<KlingTaskStatusResponse> {
  const {
    maxAttempts = 60, // 最大10分（10秒 × 60）
    pollInterval = 10000, // 10秒間隔
    onProgress,
  } = options

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const status = await getTaskStatus(taskId)

    if (onProgress) {
      onProgress(status)
    }

    if (status.status === 'completed') {
      return status
    }

    if (status.status === 'failed') {
      throw new Error(`Kling video generation failed: ${status.error || 'Unknown error'}`)
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval))
  }

  throw new Error('Kling video generation timed out')
}

// 統合生成関数
export async function generateVideo(
  request: KlingGenerationRequest
): Promise<KlingTaskResponse> {
  if (request.mode === 'image-to-video') {
    if (!request.imageUrl) {
      throw new Error('imageUrl is required for image-to-video mode')
    }
    return generateImageToVideo({
      ...request,
      imageUrl: request.imageUrl,
    })
  } else {
    return generateTextToVideo(request)
  }
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
