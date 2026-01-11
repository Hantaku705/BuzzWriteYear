/**
 * Kling AI API Client (Server-side only)
 * Provider: PiAPI (https://piapi.ai/kling-api)
 *
 * 商品画像からWebCM風の高品質動画を生成
 * O1機能対応: デュアルキーフレーム、マルチモデル、音声生成
 *
 * NOTE: このファイルはサーバーサイドでのみ使用可能
 * クライアントサイドでは constants.ts を使用してください
 */

// 型定義・価格計算を再エクスポート（後方互換性）
export {
  type KlingMode,
  type KlingDuration,
  type KlingModelVersion,
  type KlingQuality,
  type KlingAspectRatio,
  type KlingModel,
  type KlingGenerationRequest,
  type KlingTaskResponse,
  type KlingTaskStatusResponse,
  KLING_MODEL_INFO,
  calculatePrice,
  formatPrice,
  isProOnlyModel,
  supportsAudio,
  supportsDualKeyframe,
} from './constants'

import type {
  KlingModelVersion,
  KlingGenerationRequest,
  KlingTaskResponse,
  KlingTaskStatusResponse,
} from './constants'

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

// ============================================
// API関数
// ============================================

// Image-to-Video 生成開始
export async function generateImageToVideo(
  request: Omit<KlingGenerationRequest, 'mode'> & { imageUrl: string }
): Promise<KlingTaskResponse> {
  const modelVersion = request.modelVersion || '1.6'

  const input: Record<string, unknown> = {
    image_url: request.imageUrl,
    prompt: request.prompt,
    negative_prompt: request.negativePrompt || '',
    duration: request.duration || 5,
    aspect_ratio: request.aspectRatio || '9:16',
    mode: request.quality === 'pro' ? 'pro' : 'std',
    version: modelVersion,
  }

  // O1デュアルキーフレーム: 終了フレーム画像
  if (request.imageTailUrl) {
    input.image_tail_url = request.imageTailUrl
  }

  // CFG Scale
  if (request.cfgScale !== undefined) {
    input.cfg_scale = request.cfgScale
  }

  // 音声生成 (2.6のみ)
  if (request.enableAudio && modelVersion === '2.6') {
    input.enable_audio = true
  }

  const payload = {
    model: 'kling',
    task_type: 'video_generation',
    input,
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
  const modelVersion = request.modelVersion || '1.6'

  const input: Record<string, unknown> = {
    prompt: request.prompt,
    negative_prompt: request.negativePrompt || '',
    duration: request.duration || 5,
    aspect_ratio: request.aspectRatio || '9:16',
    mode: request.quality === 'pro' ? 'pro' : 'std',
    version: modelVersion,
  }

  // CFG Scale
  if (request.cfgScale !== undefined) {
    input.cfg_scale = request.cfgScale
  }

  // 音声生成 (2.6のみ)
  if (request.enableAudio && modelVersion === '2.6') {
    input.enable_audio = true
  }

  const payload = {
    model: 'kling',
    task_type: 'video_generation',
    input,
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

// Elements生成開始（画像から要素を抽出して動画に追加）
export async function generateElements(
  request: Omit<KlingGenerationRequest, 'mode'> & { elementImages: string[] }
): Promise<KlingTaskResponse> {
  // Elementsは1.6必須
  const modelVersion = '1.6'

  if (!request.elementImages?.length || request.elementImages.length > 4) {
    throw new Error('elementImages must contain 1-4 images')
  }

  const input: Record<string, unknown> = {
    prompt: request.prompt,
    negative_prompt: request.negativePrompt || '',
    duration: request.duration || 5,
    aspect_ratio: request.aspectRatio || '9:16',
    mode: request.quality === 'pro' ? 'pro' : 'std',
    version: modelVersion,
    elements: request.elementImages.map(url => ({ image_url: url })),
  }

  const payload = {
    model: 'kling',
    task_type: 'video_generation',
    input,
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

// 統合生成関数
export async function generateVideo(
  request: KlingGenerationRequest & { elementImages?: string[] }
): Promise<KlingTaskResponse> {
  if (request.mode === 'elements') {
    if (!request.elementImages?.length) {
      throw new Error('elementImages is required for elements mode')
    }
    return generateElements({
      ...request,
      elementImages: request.elementImages,
    })
  } else if (request.mode === 'image-to-video') {
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
