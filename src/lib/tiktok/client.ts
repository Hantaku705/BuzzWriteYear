/**
 * TikTok API Client
 * ドキュメント: https://developers.tiktok.com/doc/content-posting-api-get-started
 */

const TIKTOK_AUTH_BASE = 'https://www.tiktok.com'
const TIKTOK_API_BASE = 'https://open.tiktokapis.com/v2'

// 環境変数から認証情報取得
const getClientKey = () => {
  const clientKey = process.env.TIKTOK_CLIENT_KEY
  if (!clientKey) {
    throw new Error('TIKTOK_CLIENT_KEY environment variable is not set')
  }
  return clientKey
}

const getClientSecret = () => {
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET
  if (!clientSecret) {
    throw new Error('TIKTOK_CLIENT_SECRET environment variable is not set')
  }
  return clientSecret
}

const getRedirectUri = () => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${baseUrl}/api/tiktok/callback`
}

// OAuth スコープ
export const TIKTOK_SCOPES = [
  'user.info.basic',
  'user.info.profile',
  'video.publish',
  'video.upload',
] as const

// 型定義
export interface TikTokTokenResponse {
  access_token: string
  refresh_token: string
  open_id: string
  scope: string
  expires_in: number
  token_type: string
}

export interface TikTokUserInfo {
  open_id: string
  union_id?: string
  avatar_url?: string
  display_name: string
  bio_description?: string
  profile_deep_link?: string
  follower_count?: number
  following_count?: number
  likes_count?: number
  video_count?: number
}

export interface VideoUploadInitResponse {
  upload_url: string
  video_id: string
}

export interface VideoPublishResponse {
  publish_id: string
}

export interface VideoPublishStatusResponse {
  status: 'PROCESSING_UPLOAD' | 'PROCESSING_DOWNLOAD' | 'SEND_TO_USER_INBOX' | 'PUBLISH_COMPLETE' | 'FAILED'
  fail_reason?: string
  uploaded_bytes?: number
  public_video_id?: string
}

// OAuth認証URL生成
export function getAuthUrl(state: string, csrfState: string): string {
  const params = new URLSearchParams({
    client_key: getClientKey(),
    scope: TIKTOK_SCOPES.join(','),
    response_type: 'code',
    redirect_uri: getRedirectUri(),
    state,
  })

  return `${TIKTOK_AUTH_BASE}/v2/auth/authorize/?${params.toString()}`
}

// アクセストークン取得
export async function getAccessToken(code: string): Promise<TikTokTokenResponse> {
  const response = await fetch(`${TIKTOK_API_BASE}/oauth/token/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_key: getClientKey(),
      client_secret: getClientSecret(),
      code,
      grant_type: 'authorization_code',
      redirect_uri: getRedirectUri(),
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(`TikTok OAuth error: ${JSON.stringify(error)}`)
  }

  const data = await response.json()
  return data
}

// トークンリフレッシュ
export async function refreshAccessToken(
  refreshToken: string
): Promise<TikTokTokenResponse> {
  const response = await fetch(`${TIKTOK_API_BASE}/oauth/token/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_key: getClientKey(),
      client_secret: getClientSecret(),
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(`TikTok token refresh error: ${JSON.stringify(error)}`)
  }

  return response.json()
}

// ユーザー情報取得
export async function getUserInfo(accessToken: string): Promise<TikTokUserInfo> {
  const response = await fetch(
    `${TIKTOK_API_BASE}/user/info/?fields=open_id,union_id,avatar_url,display_name,bio_description,profile_deep_link,follower_count,following_count,likes_count,video_count`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(`TikTok user info error: ${JSON.stringify(error)}`)
  }

  const data = await response.json()
  return data.data.user
}

// 動画アップロード初期化（Direct Post）
export async function initVideoUpload(
  accessToken: string,
  options: {
    title: string
    privacy_level: 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'SELF_ONLY'
    disable_duet?: boolean
    disable_comment?: boolean
    disable_stitch?: boolean
    video_cover_timestamp_ms?: number
  }
): Promise<VideoUploadInitResponse> {
  const response = await fetch(`${TIKTOK_API_BASE}/post/publish/video/init/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({
      post_info: {
        title: options.title,
        privacy_level: options.privacy_level,
        disable_duet: options.disable_duet ?? false,
        disable_comment: options.disable_comment ?? false,
        disable_stitch: options.disable_stitch ?? false,
        video_cover_timestamp_ms: options.video_cover_timestamp_ms ?? 1000,
      },
      source_info: {
        source: 'FILE_UPLOAD',
        video_size: 0, // Will be updated during upload
        chunk_size: 10000000, // 10MB chunks
        total_chunk_count: 1,
      },
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(`TikTok video init error: ${JSON.stringify(error)}`)
  }

  const data = await response.json()
  return data.data
}

// 動画アップロード（チャンク）
export async function uploadVideoChunk(
  uploadUrl: string,
  videoBuffer: Buffer,
  contentRange: string
): Promise<void> {
  // BufferをBlobに変換（fetchのbodyとして使用可能にする）
  const blob = new Blob([videoBuffer as unknown as BlobPart], { type: 'video/mp4' })

  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Range': contentRange,
    },
    body: blob,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`TikTok video upload error: ${error}`)
  }
}

// 動画公開ステータス確認
export async function getPublishStatus(
  accessToken: string,
  publishId: string
): Promise<VideoPublishStatusResponse> {
  const response = await fetch(
    `${TIKTOK_API_BASE}/post/publish/status/fetch/`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        publish_id: publishId,
      }),
    }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(`TikTok publish status error: ${JSON.stringify(error)}`)
  }

  const data = await response.json()
  return data.data
}

// 動画公開完了まで待機
export async function waitForPublishComplete(
  accessToken: string,
  publishId: string,
  options: {
    maxAttempts?: number
    pollInterval?: number
    onProgress?: (status: VideoPublishStatusResponse) => void
  } = {}
): Promise<VideoPublishStatusResponse> {
  const { maxAttempts = 60, pollInterval = 5000, onProgress } = options

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const status = await getPublishStatus(accessToken, publishId)

    if (onProgress) {
      onProgress(status)
    }

    if (status.status === 'PUBLISH_COMPLETE') {
      return status
    }

    if (status.status === 'FAILED') {
      throw new Error(`TikTok publish failed: ${status.fail_reason}`)
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval))
  }

  throw new Error('TikTok publish timed out')
}

// Creator Info（クリエイター情報）取得
export async function getCreatorInfo(accessToken: string): Promise<{
  creator_avatar_url: string
  creator_username: string
  creator_nickname: string
  privacy_level_options: string[]
  comment_disabled: boolean
  duet_disabled: boolean
  stitch_disabled: boolean
  max_video_post_duration_sec: number
}> {
  const response = await fetch(
    `${TIKTOK_API_BASE}/post/publish/creator_info/query/`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(`TikTok creator info error: ${JSON.stringify(error)}`)
  }

  const data = await response.json()
  return data.data
}

// ビデオ統計情報
export interface VideoStats {
  id: string
  title?: string
  create_time: number
  cover_image_url?: string
  share_url?: string
  view_count: number
  like_count: number
  comment_count: number
  share_count: number
  download_count?: number
  duration?: number
}

// ユーザーのビデオ一覧取得
export async function listUserVideos(
  accessToken: string,
  options: {
    cursor?: number
    max_count?: number
  } = {}
): Promise<{
  videos: VideoStats[]
  cursor: number
  has_more: boolean
}> {
  const { cursor = 0, max_count = 20 } = options

  const response = await fetch(
    `${TIKTOK_API_BASE}/video/list/?fields=id,title,create_time,cover_image_url,share_url,view_count,like_count,comment_count,share_count,download_count,duration`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cursor,
        max_count,
      }),
    }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(`TikTok video list error: ${JSON.stringify(error)}`)
  }

  const data = await response.json()
  return {
    videos: data.data.videos || [],
    cursor: data.data.cursor || 0,
    has_more: data.data.has_more || false,
  }
}

// 特定ビデオの統計情報取得
export async function getVideoStats(
  accessToken: string,
  videoIds: string[]
): Promise<VideoStats[]> {
  const response = await fetch(
    `${TIKTOK_API_BASE}/video/query/?fields=id,title,create_time,cover_image_url,share_url,view_count,like_count,comment_count,share_count,download_count,duration`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filters: {
          video_ids: videoIds,
        },
      }),
    }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(`TikTok video query error: ${JSON.stringify(error)}`)
  }

  const data = await response.json()
  return data.data.videos || []
}
