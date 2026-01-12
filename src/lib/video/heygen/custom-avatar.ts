/**
 * HeyGen Custom Avatar API Client
 * Photo Avatar & Video Avatar 作成・管理
 * ドキュメント: https://docs.heygen.com/docs/photo-avatars-api
 *               https://docs.heygen.com/docs/video-avatars-api
 */

const HEYGEN_API_BASE = 'https://api.heygen.com'

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

// ============================================
// 型定義
// ============================================

export interface PhotoAvatarCreateRequest {
  name: string
  image_url: string
  gender?: 'male' | 'female'
}

export interface PhotoAvatarResponse {
  avatar_id: string
  name: string
  status: 'processing' | 'completed' | 'failed'
  preview_image_url?: string
  error?: string
}

export interface VideoAvatarCreateRequest {
  name: string
  training_video_url: string
  consent_video_url: string
}

export interface VideoAvatarResponse {
  avatar_id: string
  training_id: string
  name: string
  status: 'queued' | 'training' | 'completed' | 'failed'
  preview_image_url?: string
  preview_video_url?: string
  estimated_time_minutes?: number
  error?: string
}

export interface TrainingStatusResponse {
  training_id: string
  status: 'queued' | 'training' | 'completed' | 'failed'
  progress?: number
  estimated_time_minutes?: number
  error?: string
}

export interface CustomAvatar {
  avatar_id: string
  name: string
  type: 'photo' | 'video'
  status: 'processing' | 'completed' | 'failed'
  preview_image_url?: string
  preview_video_url?: string
  created_at: string
}

// ============================================
// Photo Avatar API
// ============================================

/**
 * Photo Avatar を作成（写真1枚から）
 * Business以上のプランが必要
 */
export async function createPhotoAvatar(
  request: PhotoAvatarCreateRequest
): Promise<PhotoAvatarResponse> {
  const response = await heygenRequest<{ data: PhotoAvatarResponse }>(
    '/v2/photo_avatar',
    {
      method: 'POST',
      body: JSON.stringify({
        name: request.name,
        image_url: request.image_url,
        gender: request.gender || 'female',
      }),
    }
  )

  return response.data
}

/**
 * Photo Avatar Group を作成してトレーニング
 * 一貫性向上のためのグループ学習
 */
export async function trainPhotoAvatarGroup(
  groupId: string
): Promise<{ training_id: string; status: string }> {
  const response = await heygenRequest<{
    data: { training_id: string; status: string }
  }>(`/v2/photo_avatar/group/${groupId}/train`, {
    method: 'POST',
  })

  return response.data
}

// ============================================
// Video Avatar API
// ============================================

/**
 * Video Avatar を作成（動画学習）
 * Enterprise契約が必要
 */
export async function createVideoAvatar(
  request: VideoAvatarCreateRequest
): Promise<VideoAvatarResponse> {
  // Step 1: トレーニング動画をアップロード
  const trainingResponse = await heygenRequest<{
    data: { training_id: string }
  }>('/v2/video_avatars/training_videos', {
    method: 'POST',
    body: JSON.stringify({
      video_url: request.training_video_url,
    }),
  })

  // Step 2: 同意書動画をアップロード
  await heygenRequest<{ data: { consent_id: string } }>(
    '/v2/video_avatars/consent_videos',
    {
      method: 'POST',
      body: JSON.stringify({
        training_id: trainingResponse.data.training_id,
        video_url: request.consent_video_url,
      }),
    }
  )

  // Step 3: アバター作成開始
  const avatarResponse = await heygenRequest<{ data: VideoAvatarResponse }>(
    '/v2/video_avatars',
    {
      method: 'POST',
      body: JSON.stringify({
        training_id: trainingResponse.data.training_id,
        name: request.name,
      }),
    }
  )

  return {
    ...avatarResponse.data,
    training_id: trainingResponse.data.training_id,
  }
}

// ============================================
// Status & List API
// ============================================

/**
 * トレーニング状態を取得
 */
export async function getTrainingStatus(
  trainingId: string
): Promise<TrainingStatusResponse> {
  const response = await heygenRequest<{ data: TrainingStatusResponse }>(
    `/v2/video_avatars/training/${trainingId}/status`
  )

  return response.data
}

/**
 * Photo Avatar の状態を取得
 */
export async function getPhotoAvatarStatus(
  avatarId: string
): Promise<PhotoAvatarResponse> {
  const response = await heygenRequest<{ data: PhotoAvatarResponse }>(
    `/v2/photo_avatar/${avatarId}`
  )

  return response.data
}

/**
 * カスタムアバター一覧を取得
 */
export async function listCustomAvatars(): Promise<CustomAvatar[]> {
  // Photo Avatars
  const photoResponse = await heygenRequest<{
    data: { avatars: Array<{
      avatar_id: string
      name: string
      status: string
      preview_image_url?: string
      created_at: string
    }> }
  }>('/v2/photo_avatars')

  const photoAvatars: CustomAvatar[] = photoResponse.data.avatars.map(a => ({
    avatar_id: a.avatar_id,
    name: a.name,
    type: 'photo' as const,
    status: a.status as CustomAvatar['status'],
    preview_image_url: a.preview_image_url,
    created_at: a.created_at,
  }))

  // Video Avatars (Enterprise only)
  let videoAvatars: CustomAvatar[] = []
  try {
    const videoResponse = await heygenRequest<{
      data: { avatars: Array<{
        avatar_id: string
        name: string
        status: string
        preview_image_url?: string
        preview_video_url?: string
        created_at: string
      }> }
    }>('/v2/video_avatars')

    videoAvatars = videoResponse.data.avatars.map(a => ({
      avatar_id: a.avatar_id,
      name: a.name,
      type: 'video' as const,
      status: a.status as CustomAvatar['status'],
      preview_image_url: a.preview_image_url,
      preview_video_url: a.preview_video_url,
      created_at: a.created_at,
    }))
  } catch {
    // Video Avatar APIはEnterprise限定なのでエラーは無視
    console.log('Video avatars not available (Enterprise feature)')
  }

  return [...photoAvatars, ...videoAvatars].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
}

/**
 * アバターを削除
 */
export async function deleteCustomAvatar(
  avatarId: string,
  type: 'photo' | 'video'
): Promise<void> {
  const endpoint = type === 'photo'
    ? `/v2/photo_avatar/${avatarId}`
    : `/v2/video_avatars/${avatarId}`

  await heygenRequest(endpoint, { method: 'DELETE' })
}

// ============================================
// Polling Helpers
// ============================================

/**
 * Photo Avatar 完了まで待機
 */
export async function waitForPhotoAvatarCompletion(
  avatarId: string,
  options: {
    maxAttempts?: number
    pollInterval?: number
    onProgress?: (status: PhotoAvatarResponse) => void
  } = {}
): Promise<PhotoAvatarResponse> {
  const {
    maxAttempts = 30,
    pollInterval = 10000, // 10秒
    onProgress,
  } = options

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const status = await getPhotoAvatarStatus(avatarId)

    if (onProgress) {
      onProgress(status)
    }

    if (status.status === 'completed') {
      return status
    }

    if (status.status === 'failed') {
      throw new Error(`Photo avatar creation failed: ${status.error}`)
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval))
  }

  throw new Error('Photo avatar creation timed out')
}

/**
 * Video Avatar トレーニング完了まで待機
 */
export async function waitForVideoAvatarTraining(
  trainingId: string,
  options: {
    maxAttempts?: number
    pollInterval?: number
    onProgress?: (status: TrainingStatusResponse) => void
  } = {}
): Promise<TrainingStatusResponse> {
  const {
    maxAttempts = 360, // 最大6時間（1分間隔）
    pollInterval = 60000, // 1分
    onProgress,
  } = options

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const status = await getTrainingStatus(trainingId)

    if (onProgress) {
      onProgress(status)
    }

    if (status.status === 'completed') {
      return status
    }

    if (status.status === 'failed') {
      throw new Error(`Video avatar training failed: ${status.error}`)
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval))
  }

  throw new Error('Video avatar training timed out')
}
