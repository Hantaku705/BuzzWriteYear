/**
 * TikTok関連の型定義
 */

// 既存のクライアント型を再エクスポート
export type {
  TikTokTokenResponse,
  TikTokUserInfo,
  VideoUploadInitResponse,
  VideoPublishResponse,
  VideoPublishStatusResponse,
  VideoStats,
} from '@/lib/tiktok/client'

// 公開設定
export type TikTokPrivacyLevel = 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'SELF_ONLY'

// TikTokアカウント（DBテーブル）
export interface TikTokAccount {
  id: string
  user_id: string
  open_id: string
  display_name: string
  avatar_url: string | null
  follower_count: number | null
  access_token: string
  refresh_token: string
  token_expires_at: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// TikTok投稿（DBテーブル）
export interface TikTokPost {
  id: string
  video_id: string
  tiktok_account_id: string
  publish_id: string | null
  public_video_id: string | null
  caption: string
  hashtags: string[]
  privacy_level: TikTokPrivacyLevel
  status: TikTokPostStatus
  error_message: string | null
  created_at: string
  posted_at: string | null
}

export type TikTokPostStatus = 'pending' | 'processing' | 'completed' | 'failed'

// API Request/Response types

// POST /api/tiktok/post リクエスト
export interface PostToTikTokRequest {
  videoId: string
  accountId: string
  caption: string
  hashtags: string[]
  privacyLevel: TikTokPrivacyLevel
}

// POST /api/tiktok/post レスポンス
export interface PostToTikTokResponse {
  postId: string
  jobId: string
  status: 'queued'
}

// GET /api/tiktok/accounts レスポンス
export interface TikTokAccountResponse {
  id: string
  open_id: string
  display_name: string
  avatar_url: string | null
  follower_count: number | null
  is_active: boolean
  token_expires_at: string
}

// GET /api/tiktok/post/[postId] レスポンス
export interface PostStatusResponse {
  id: string
  status: TikTokPostStatus
  progress: number
  publicVideoId: string | null
  errorMessage: string | null
  postedAt: string | null
}

// BullMQ Job Data
export interface TikTokPostJobData {
  postId: string
  videoId: string
  accountId: string
  caption: string
  hashtags: string[]
  privacyLevel: TikTokPrivacyLevel
  userId: string
}
