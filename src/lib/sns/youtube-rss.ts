/**
 * YouTube RSS クライアント
 * APIキー不要でチャンネルの動画一覧を取得
 * 注意: 再生数・いいね数は取得不可
 */

/**
 * YouTube動画情報（RSS経由）
 */
export interface YouTubeVideo {
  id: string
  title: string
  description: string
  publishedAt: Date
  thumbnailUrl: string
  videoUrl: string
  channelId: string
  channelName: string
  // RSS経由では再生数等は取得不可
}

/**
 * YouTubeチャンネル情報
 */
export interface YouTubeChannel {
  id: string
  name: string
  url: string
}

/**
 * チャンネルIDからRSSフィードURLを生成
 */
function getRssFeedUrl(channelId: string): string {
  return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`
}

/**
 * チャンネルの動画一覧を取得（RSS経由）
 */
export async function getYouTubeChannelVideos(channelId: string): Promise<YouTubeVideo[]> {
  const feedUrl = getRssFeedUrl(channelId)

  const response = await fetch(feedUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch YouTube RSS: ${response.status}`)
  }

  const xmlText = await response.text()
  return parseRssFeed(xmlText, channelId)
}

/**
 * RSSフィードをパース
 */
function parseRssFeed(xmlText: string, channelId: string): YouTubeVideo[] {
  const videos: YouTubeVideo[] = []

  // チャンネル名を取得
  const channelNameMatch = xmlText.match(/<name>([^<]+)<\/name>/)
  const channelName = channelNameMatch ? channelNameMatch[1] : ''

  // エントリーを抽出
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g
  let match

  while ((match = entryRegex.exec(xmlText)) !== null) {
    const entry = match[1]

    // 動画IDを抽出
    const videoIdMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)
    if (!videoIdMatch) continue

    const videoId = videoIdMatch[1]

    // タイトルを抽出
    const titleMatch = entry.match(/<title>([^<]+)<\/title>/)
    const title = titleMatch ? decodeXmlEntities(titleMatch[1]) : ''

    // 公開日を抽出
    const publishedMatch = entry.match(/<published>([^<]+)<\/published>/)
    const publishedAt = publishedMatch ? new Date(publishedMatch[1]) : new Date()

    // 説明を抽出
    const descriptionMatch = entry.match(/<media:description>([^<]*)<\/media:description>/)
    const description = descriptionMatch ? decodeXmlEntities(descriptionMatch[1]) : ''

    // サムネイルを抽出
    const thumbnailMatch = entry.match(/<media:thumbnail[^>]+url="([^"]+)"/)
    const thumbnailUrl = thumbnailMatch ? thumbnailMatch[1] : `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`

    videos.push({
      id: videoId,
      title,
      description,
      publishedAt,
      thumbnailUrl,
      videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
      channelId,
      channelName,
    })
  }

  return videos
}

/**
 * XMLエンティティをデコード
 */
function decodeXmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
}

/**
 * URLからチャンネルIDを取得
 * 注意: @ハンドル形式はページをフェッチして解決する必要あり
 */
export async function resolveYouTubeChannelId(url: string): Promise<string | null> {
  // 標準形式: youtube.com/channel/UCxxx
  const channelMatch = url.match(/\/channel\/([\w-]+)/)
  if (channelMatch) {
    return channelMatch[1]
  }

  // @ハンドル形式やc/形式の場合はページをフェッチ
  if (url.includes('youtube.com/@') || url.includes('youtube.com/c/')) {
    try {
      const response = await fetch(url)
      if (!response.ok) return null

      const html = await response.text()

      // チャンネルIDを抽出
      const idMatch = html.match(/"channelId":"([\w-]+)"/)
      if (idMatch) {
        return idMatch[1]
      }

      // 別パターン
      const altMatch = html.match(/channel_id=([\w-]+)/)
      if (altMatch) {
        return altMatch[1]
      }
    } catch {
      return null
    }
  }

  return null
}

/**
 * YouTube Shorts URLかどうか判定
 */
export function isYouTubeShortsUrl(url: string): boolean {
  return /youtube\.com\/shorts\/[\w-]+/.test(url)
}

/**
 * YouTube動画をダウンロード
 * 注意: 直接ダウンロードは不可、外部サービスが必要
 */
export async function downloadYouTubeVideo(videoId: string): Promise<Buffer> {
  // YouTube動画のダウンロードには専用APIが必要
  // ここではプレースホルダーを返す
  throw new Error(
    'YouTube video download requires external service (e.g., youtube-dl, Apify). ' +
    'Please use n8n webhook or external API to download YouTube videos.'
  )
}

/**
 * チャンネル情報と動画一覧を取得
 */
export async function getYouTubeInsight(
  channelIdOrUrl: string
): Promise<{
  channel: YouTubeChannel
  videos: YouTubeVideo[]
}> {
  // URLの場合はチャンネルIDを解決
  let channelId = channelIdOrUrl
  if (channelIdOrUrl.includes('youtube.com')) {
    const resolved = await resolveYouTubeChannelId(channelIdOrUrl)
    if (!resolved) {
      throw new Error('Could not resolve YouTube channel ID')
    }
    channelId = resolved
  }

  const videos = await getYouTubeChannelVideos(channelId)

  const channel: YouTubeChannel = {
    id: channelId,
    name: videos[0]?.channelName || '',
    url: `https://www.youtube.com/channel/${channelId}`,
  }

  return { channel, videos }
}
