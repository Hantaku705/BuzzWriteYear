/**
 * SNSプラットフォーム判定・URL解析ユーティリティ
 */

export type Platform = 'TikTok' | 'Instagram' | 'YouTube' | 'Threads' | 'X'

/**
 * URLからプラットフォームを判定
 */
export function detectPlatform(url: string): Platform | null {
  const lowUrl = url.toLowerCase()

  if (lowUrl.includes('tiktok.com')) return 'TikTok'
  if (lowUrl.includes('instagram.com')) return 'Instagram'
  if (lowUrl.includes('youtube.com') || lowUrl.includes('youtu.be')) return 'YouTube'
  if (lowUrl.includes('threads.net')) return 'Threads'
  if (lowUrl.includes('twitter.com') || lowUrl.includes('x.com')) return 'X'

  return null
}

/**
 * TikTokプロフィールURLかどうか判定
 */
export function isTikTokProfileUrl(url: string): boolean {
  return /tiktok\.com\/@[\w.-]+\/?$/.test(url)
}

/**
 * TikTok動画URLかどうか判定
 */
export function isTikTokVideoUrl(url: string): boolean {
  return /tiktok\.com\/@[\w.-]+\/video\/\d+/.test(url) ||
         /tiktok\.com\/t\/[\w]+/.test(url) ||
         /vm\.tiktok\.com\/[\w]+/.test(url)
}

/**
 * TikTok URLから動画IDを抽出
 */
export function extractTikTokVideoId(url: string): string | null {
  // 標準形式: tiktok.com/@user/video/1234567890
  const standardMatch = url.match(/\/video\/(\d+)/)
  if (standardMatch) return standardMatch[1]

  // 短縮URL形式は解決が必要（別途処理）
  return null
}

/**
 * TikTok URLからユーザー名を抽出
 */
export function extractTikTokUsername(url: string): string | null {
  const match = url.match(/tiktok\.com\/@([\w.-]+)/)
  return match ? match[1] : null
}

/**
 * InstagramプロフィールURLかどうか判定
 */
export function isInstagramProfileUrl(url: string): boolean {
  return /instagram\.com\/[\w.-]+\/?$/.test(url) &&
         !url.includes('/reel/') &&
         !url.includes('/p/')
}

/**
 * Instagram ReelURLかどうか判定
 */
export function isInstagramReelUrl(url: string): boolean {
  return /instagram\.com\/reel\/[\w-]+/.test(url) ||
         /instagram\.com\/p\/[\w-]+/.test(url)
}

/**
 * Instagram URLからユーザー名を抽出
 */
export function extractInstagramUsername(url: string): string | null {
  const match = url.match(/instagram\.com\/([\w.-]+)/)
  if (match && !['reel', 'p', 'stories'].includes(match[1])) {
    return match[1]
  }
  return null
}

/**
 * Instagram URLからReelコードを抽出
 */
export function extractInstagramReelCode(url: string): string | null {
  const reelMatch = url.match(/\/reel\/([\w-]+)/)
  if (reelMatch) return reelMatch[1]

  const postMatch = url.match(/\/p\/([\w-]+)/)
  if (postMatch) return postMatch[1]

  return null
}

/**
 * YouTubeチャンネルURLかどうか判定
 */
export function isYouTubeChannelUrl(url: string): boolean {
  return /youtube\.com\/(channel\/|@|c\/)[\w-]+/.test(url)
}

/**
 * YouTube動画URLかどうか判定
 */
export function isYouTubeVideoUrl(url: string): boolean {
  return /youtube\.com\/watch\?v=[\w-]+/.test(url) ||
         /youtu\.be\/[\w-]+/.test(url) ||
         /youtube\.com\/shorts\/[\w-]+/.test(url)
}

/**
 * YouTube URLから動画IDを抽出
 */
export function extractYouTubeVideoId(url: string): string | null {
  // 標準形式: youtube.com/watch?v=xxx
  const standardMatch = url.match(/[?&]v=([\w-]+)/)
  if (standardMatch) return standardMatch[1]

  // 短縮形式: youtu.be/xxx
  const shortMatch = url.match(/youtu\.be\/([\w-]+)/)
  if (shortMatch) return shortMatch[1]

  // Shorts形式: youtube.com/shorts/xxx
  const shortsMatch = url.match(/\/shorts\/([\w-]+)/)
  if (shortsMatch) return shortsMatch[1]

  return null
}

/**
 * YouTube URLからチャンネルIDを抽出
 */
export function extractYouTubeChannelId(url: string): string | null {
  const match = url.match(/\/channel\/([\w-]+)/)
  return match ? match[1] : null
}

/**
 * URLの正規化（トラッキングパラメータ削除等）
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url)
    // 不要なパラメータを削除
    const paramsToRemove = ['utm_source', 'utm_medium', 'utm_campaign', 'igshid', 'fbclid']
    paramsToRemove.forEach(param => parsed.searchParams.delete(param))
    return parsed.toString()
  } catch {
    return url
  }
}
