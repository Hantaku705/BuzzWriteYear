/**
 * Instagram RapidAPI クライアント（Instagram Scraper API2）
 * データ取得・動画ダウンロード用
 */

import { VideoMetrics } from './metrics'

const RAPIDAPI_KEY = process.env.INSTAGRAM_RAPIDAPI_KEY || process.env.RAPIDAPI_KEY

/**
 * Instagramユーザー情報
 */
export interface InstagramUser {
  id: string
  username: string
  fullName: string
  avatarUrl: string
  followerCount: number
  followingCount: number
  postCount: number
  bio: string
  isVerified: boolean
  isPrivate: boolean
  externalUrl?: string
}

/**
 * Instagram Reel情報
 */
export interface InstagramReel {
  id: string
  shortcode: string
  caption: string
  timestamp: number       // Unix timestamp
  duration: number        // 秒
  thumbnailUrl: string
  videoUrl: string
  author: {
    id: string
    username: string
    fullName: string
  }
  metrics: VideoMetrics
  hashtags: string[]
  location?: {
    name: string
    id: string
  }
}

/**
 * RapidAPIリクエストヘッダー
 */
function getHeaders(host: string): HeadersInit {
  if (!RAPIDAPI_KEY) {
    throw new Error('INSTAGRAM_RAPIDAPI_KEY or RAPIDAPI_KEY is not set')
  }

  return {
    'X-RapidAPI-Key': RAPIDAPI_KEY,
    'X-RapidAPI-Host': host,
  }
}

/**
 * ユーザー情報を取得
 */
export async function getInstagramUser(username: string): Promise<InstagramUser> {
  const cleanUsername = username.replace('@', '')

  const response = await fetch(
    `https://instagram-scraper-api2.p.rapidapi.com/v1/info?username_or_id_or_url=${encodeURIComponent(cleanUsername)}`,
    {
      method: 'GET',
      headers: getHeaders('instagram-scraper-api2.p.rapidapi.com'),
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch Instagram user: ${response.status}`)
  }

  const data = await response.json()
  const user = data.data || data

  if (!user || !user.id) {
    throw new Error('User not found')
  }

  return {
    id: user.id,
    username: user.username,
    fullName: user.full_name || '',
    avatarUrl: user.profile_pic_url_hd || user.profile_pic_url || '',
    followerCount: user.follower_count || 0,
    followingCount: user.following_count || 0,
    postCount: user.media_count || 0,
    bio: user.biography || '',
    isVerified: user.is_verified || false,
    isPrivate: user.is_private || false,
    externalUrl: user.external_url,
  }
}

/**
 * ユーザーのReels一覧を取得
 */
export async function getInstagramReels(
  usernameOrId: string,
  count: number = 30
): Promise<InstagramReel[]> {
  const response = await fetch(
    `https://instagram-scraper-api2.p.rapidapi.com/v1.2/reels?username_or_id_or_url=${encodeURIComponent(usernameOrId)}&count=${count}`,
    {
      method: 'GET',
      headers: getHeaders('instagram-scraper-api2.p.rapidapi.com'),
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch Instagram reels: ${response.status}`)
  }

  const data = await response.json()
  const items = data.data?.items || data.items || []

  return items.map(parseReelItem)
}

/**
 * Reel詳細を取得（URL/shortcode指定）
 */
export async function getInstagramReelDetail(urlOrShortcode: string): Promise<InstagramReel> {
  // shortcodeを抽出
  let shortcode = urlOrShortcode
  if (urlOrShortcode.includes('instagram.com')) {
    const match = urlOrShortcode.match(/\/(?:reel|p)\/([\w-]+)/)
    if (match) {
      shortcode = match[1]
    }
  }

  const response = await fetch(
    `https://instagram-scraper-api2.p.rapidapi.com/v1/post_info?code_or_id_or_url=${encodeURIComponent(shortcode)}`,
    {
      method: 'GET',
      headers: getHeaders('instagram-scraper-api2.p.rapidapi.com'),
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch Instagram reel detail: ${response.status}`)
  }

  const data = await response.json()
  const item = data.data || data

  if (!item || !item.id) {
    throw new Error('Reel not found')
  }

  return parseReelItem(item)
}

/**
 * 動画をダウンロード
 */
export async function downloadInstagramReel(urlOrShortcode: string): Promise<Buffer> {
  // ダウンロードURLを取得
  const response = await fetch(
    `https://instagram-scraper-stable-api.p.rapidapi.com/get_media_data.php?reel_post_code_or_url=${encodeURIComponent(urlOrShortcode)}&type=reel`,
    {
      method: 'GET',
      headers: getHeaders('instagram-scraper-stable-api.p.rapidapi.com'),
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to get download URL: ${response.status}`)
  }

  const data = await response.json()
  const downloadUrl = data.video_url || data.download_url

  if (!downloadUrl) {
    throw new Error('Download URL not found')
  }

  // 動画をダウンロード
  const videoResponse = await fetch(downloadUrl)
  if (!videoResponse.ok) {
    throw new Error(`Failed to download video: ${videoResponse.status}`)
  }

  const arrayBuffer = await videoResponse.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/**
 * APIレスポンスをパース
 */
function parseReelItem(item: Record<string, unknown>): InstagramReel {
  const owner = (item.owner || item.user || {}) as Record<string, unknown>
  const caption = (item.caption || {}) as Record<string, unknown>
  const captionText = String(caption.text || item.caption_text || '')

  // ハッシュタグを抽出
  const hashtagMatches = captionText.match(/#[\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+/g)
  const hashtags = hashtagMatches || []

  // 動画URL取得
  const videoVersions = (item.video_versions || []) as Array<{ url: string }>
  const videoUrl = videoVersions[0]?.url || String(item.video_url || '')

  // サムネイル取得
  const imageVersions2 = item.image_versions2 as { candidates?: Array<{ url: string }> } | undefined
  const imageVersions = (imageVersions2?.candidates || item.thumbnail_resources || []) as Array<{ url: string }>
  const thumbnailUrl = imageVersions[0]?.url || String(item.display_url || item.thumbnail_url || '')

  return {
    id: String(item.id || item.pk),
    shortcode: String(item.code || item.shortcode),
    caption: captionText,
    timestamp: Number(item.taken_at || item.taken_at_timestamp || 0),
    duration: Number(item.video_duration || 0),
    thumbnailUrl,
    videoUrl,
    author: {
      id: String(owner.id || owner.pk || ''),
      username: String(owner.username || ''),
      fullName: String(owner.full_name || ''),
    },
    metrics: {
      playCount: Number(item.play_count || item.video_play_count || 0),
      likeCount: Number(item.like_count || 0),
      commentCount: Number(item.comment_count || 0),
      shareCount: Number(item.share_count || 0),
      // Instagram APIでは保存数は取得不可
      collectCount: 0,
    },
    hashtags,
    location: item.location ? {
      name: String((item.location as Record<string, unknown>).name || ''),
      id: String((item.location as Record<string, unknown>).id || (item.location as Record<string, unknown>).pk || ''),
    } : undefined,
  }
}

/**
 * ユーザー名またはURLからプロフィール情報とReelsを取得
 */
export async function getInstagramInsight(
  usernameOrUrl: string,
  reelCount: number = 30
): Promise<{
  user: InstagramUser
  reels: InstagramReel[]
  aggregatedMetrics: VideoMetrics
}> {
  // URLからユーザー名を抽出
  let username = usernameOrUrl
  if (usernameOrUrl.includes('instagram.com')) {
    const match = usernameOrUrl.match(/instagram\.com\/([\w.-]+)/)
    if (match && !['reel', 'p', 'stories'].includes(match[1])) {
      username = match[1]
    }
  }

  const user = await getInstagramUser(username)

  // プライベートアカウントはReels取得不可
  if (user.isPrivate) {
    return {
      user,
      reels: [],
      aggregatedMetrics: { playCount: 0, likeCount: 0, commentCount: 0, shareCount: 0, collectCount: 0 },
    }
  }

  const reels = await getInstagramReels(user.id, reelCount)

  // メトリクス集計
  const aggregatedMetrics = reels.reduce(
    (acc, reel) => ({
      playCount: acc.playCount + reel.metrics.playCount,
      likeCount: acc.likeCount + reel.metrics.likeCount,
      commentCount: acc.commentCount + reel.metrics.commentCount,
      shareCount: acc.shareCount + reel.metrics.shareCount,
      collectCount: 0, // Instagram では取得不可
    }),
    { playCount: 0, likeCount: 0, commentCount: 0, shareCount: 0, collectCount: 0 }
  )

  return { user, reels, aggregatedMetrics }
}
