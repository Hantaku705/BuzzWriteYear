/**
 * TikTok RapidAPI クライアント（ScrapTik）
 * データ取得・動画ダウンロード用
 */

import { VideoMetrics } from './metrics'

const RAPIDAPI_KEY = process.env.TIKTOK_RAPIDAPI_KEY || process.env.RAPIDAPI_KEY

/**
 * TikTokユーザー情報
 */
export interface TikTokUser {
  id: string
  secUid: string         // セキュアユーザーID（API呼び出しに必要）
  uniqueId: string       // ユーザー名（@なし）
  nickname: string       // 表示名
  avatarUrl: string
  followerCount: number
  followingCount: number
  heartCount: number     // 総いいね数
  videoCount: number
  bio: string
  verified: boolean
}

/**
 * TikTok動画情報
 */
export interface TikTokVideo {
  id: string
  desc: string           // キャプション
  createTime: number     // Unix timestamp
  duration: number       // 秒
  coverUrl: string
  playUrl: string        // 動画URL（ウォーターマーク付き）
  downloadUrl?: string   // ダウンロード用URL
  author: {
    id: string
    uniqueId: string
    nickname: string
  }
  metrics: VideoMetrics
  hashtags: string[]
  music?: {
    id: string
    title: string
    author: string
  }
}

/**
 * RapidAPIリクエストヘッダー
 */
function getHeaders(host: string): HeadersInit {
  if (!RAPIDAPI_KEY) {
    throw new Error('TIKTOK_RAPIDAPI_KEY or RAPIDAPI_KEY is not set')
  }

  return {
    'X-RapidAPI-Key': RAPIDAPI_KEY,
    'X-RapidAPI-Host': host,
  }
}

/**
 * ユーザー情報を取得
 */
export async function getTikTokUser(username: string): Promise<TikTokUser> {
  const cleanUsername = username.replace('@', '')

  // tiktok-api23 を使用
  const response = await fetch(
    `https://tiktok-api23.p.rapidapi.com/api/user/info?uniqueId=${encodeURIComponent(cleanUsername)}`,
    {
      method: 'GET',
      headers: getHeaders('tiktok-api23.p.rapidapi.com'),
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch TikTok user: ${response.status}`)
  }

  const data = await response.json()
  const user = data.userInfo?.user || data.user
  // tiktok-api23はstatsが別フィールドで返る
  const stats = data.userInfo?.stats || {}

  if (!user) {
    throw new Error('User not found')
  }

  return {
    id: user.id,
    secUid: user.secUid || '',
    uniqueId: user.uniqueId,
    nickname: user.nickname,
    avatarUrl: user.avatarLarger || user.avatarMedium,
    followerCount: stats.followerCount || user.followerCount || 0,
    followingCount: stats.followingCount || user.followingCount || 0,
    heartCount: stats.heartCount || stats.heart || user.heartCount || user.heart || 0,
    videoCount: stats.videoCount || user.videoCount || 0,
    bio: user.signature || '',
    verified: user.verified || false,
  }
}

/**
 * ユーザーの投稿一覧を取得
 */
export async function getTikTokUserVideos(
  userId: string,
  count: number = 30
): Promise<TikTokVideo[]> {
  // tiktok-api23 を使用（secUidが必要な場合あり）
  const response = await fetch(
    `https://tiktok-api23.p.rapidapi.com/api/user/posts?secUid=${encodeURIComponent(userId)}&count=${count}`,
    {
      method: 'GET',
      headers: getHeaders('tiktok-api23.p.rapidapi.com'),
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch TikTok videos: ${response.status}`)
  }

  const data = await response.json()
  // tiktok-api23は { data: { itemList: [...] } } 形式
  const items = data.data?.itemList || data.itemList || data.aweme_list || []

  return items.map(parseVideoItem)
}

/**
 * 動画詳細を取得
 */
export async function getTikTokVideoDetail(videoId: string): Promise<TikTokVideo> {
  const response = await fetch(
    `https://tiktok-api23.p.rapidapi.com/api/post/detail?videoId=${videoId}`,
    {
      method: 'GET',
      headers: getHeaders('tiktok-api23.p.rapidapi.com'),
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch TikTok video detail: ${response.status}`)
  }

  const data = await response.json()
  const item = data.itemInfo?.itemStruct || data.aweme_detail

  if (!item) {
    throw new Error('Video not found')
  }

  return parseVideoItem(item)
}

/**
 * 動画URLから詳細を取得
 */
export async function getTikTokVideoByUrl(url: string): Promise<TikTokVideo> {
  // 短縮URLを解決
  const resolvedUrl = await resolveShortUrl(url)

  // 動画IDを抽出
  const videoIdMatch = resolvedUrl.match(/\/video\/(\d+)/)
  if (!videoIdMatch) {
    throw new Error('Could not extract video ID from URL')
  }

  return getTikTokVideoDetail(videoIdMatch[1])
}

/**
 * 動画をダウンロード
 */
export async function downloadTikTokVideo(videoUrl: string): Promise<Buffer> {
  // ダウンロードURLを取得
  const response = await fetch(
    `https://tiktok-video-downloader-api.p.rapidapi.com/media?videoUrl=${encodeURIComponent(videoUrl)}`,
    {
      method: 'GET',
      headers: getHeaders('tiktok-video-downloader-api.p.rapidapi.com'),
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to get download URL: ${response.status}`)
  }

  const data = await response.json()
  const downloadUrl = data.video?.noWatermark || data.video?.watermark || data.downloadUrl

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
 * 短縮URLを解決
 */
async function resolveShortUrl(url: string): Promise<string> {
  // すでに標準形式ならそのまま返す
  if (url.includes('/video/')) {
    return url
  }

  // 短縮URLをリダイレクト解決
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
    })
    return response.url
  } catch {
    return url
  }
}

/**
 * APIレスポンスをパース
 */
function parseVideoItem(item: Record<string, unknown>): TikTokVideo {
  const stats = (item.statistics || item.stats || {}) as Record<string, number>
  const author = (item.author || {}) as Record<string, unknown>
  const video = (item.video || {}) as Record<string, unknown> & { play_addr?: { url_list?: string[] } }
  const music = (item.music || {}) as Record<string, unknown>

  // ハッシュタグを抽出
  const challenges = (item.challenges || item.textExtra || []) as Array<{ title?: string; hashtagName?: string }>
  const hashtags = challenges
    .map(c => c.title || c.hashtagName)
    .filter((h): h is string => !!h)

  return {
    id: String(item.id || item.aweme_id),
    desc: String(item.desc || item.description || ''),
    createTime: Number(item.createTime || item.create_time || 0),
    duration: Number(video.duration || item.duration || 0),
    coverUrl: String(video.cover || video.originCover || item.cover || ''),
    playUrl: String(video.playAddr || video.play_addr?.url_list?.[0] || ''),
    author: {
      id: String(author.id || ''),
      uniqueId: String(author.uniqueId || author.unique_id || ''),
      nickname: String(author.nickname || ''),
    },
    metrics: {
      playCount: stats.playCount || stats.play_count || 0,
      likeCount: stats.diggCount || stats.digg_count || stats.likeCount || 0,
      commentCount: stats.commentCount || stats.comment_count || 0,
      shareCount: stats.shareCount || stats.share_count || 0,
      collectCount: stats.collectCount || stats.collect_count || 0,
    },
    hashtags,
    music: music.id ? {
      id: String(music.id),
      title: String(music.title || ''),
      author: String(music.authorName || music.author || ''),
    } : undefined,
  }
}

/**
 * ユーザー名またはURLからプロフィール情報と動画を取得
 */
export async function getTikTokInsight(
  usernameOrUrl: string,
  videoCount: number = 30
): Promise<{
  user: TikTokUser
  videos: TikTokVideo[]
  aggregatedMetrics: VideoMetrics
}> {
  // URLからユーザー名を抽出
  let username = usernameOrUrl
  if (usernameOrUrl.includes('tiktok.com')) {
    const match = usernameOrUrl.match(/@([\w.-]+)/)
    if (match) {
      username = match[1]
    }
  }

  const user = await getTikTokUser(username)
  // secUidを使用してposts取得（tiktok-api23はsecUidが必要）
  const videos = await getTikTokUserVideos(user.secUid, videoCount)

  // メトリクス集計
  const aggregatedMetrics = videos.reduce(
    (acc, video) => ({
      playCount: acc.playCount + video.metrics.playCount,
      likeCount: acc.likeCount + video.metrics.likeCount,
      commentCount: acc.commentCount + video.metrics.commentCount,
      shareCount: acc.shareCount + video.metrics.shareCount,
      collectCount: (acc.collectCount || 0) + (video.metrics.collectCount || 0),
    }),
    { playCount: 0, likeCount: 0, commentCount: 0, shareCount: 0, collectCount: 0 }
  )

  return { user, videos, aggregatedMetrics }
}
