import { createClient } from '@/lib/supabase/client'

export interface GMVDataPoint {
  date: string
  gmv: number
  orders: number
  views: number
  clicks: number
}

export interface VideoPerformance {
  id: string
  title: string
  templateType: string
  postedAt: string
  views: number
  likes: number
  comments: number
  shares: number
  clicks: number
  orders: number
  gmv: number
  conversionRate: number
  trend: 'up' | 'down' | 'stable'
}

export interface TemplatePerformance {
  id: string
  name: string
  type: 'remotion' | 'heygen' | 'ffmpeg'
  contentType: string
  videoCount: number
  totalViews: number
  totalGmv: number
  avgConversionRate: number
  performanceScore: number
}

export interface AnalyticsSummary {
  totalGmv: number
  totalOrders: number
  totalViews: number
  totalLikes: number
  totalComments: number
  totalShares: number
  avgConversionRate: number
}

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const supabase = createClient()

  const { data } = await supabase
    .from('video_analytics')
    .select('views, likes, comments, shares, clicks, orders, gmv')

  let totalGmv = 0
  let totalViews = 0
  let totalLikes = 0
  let totalComments = 0
  let totalShares = 0
  let totalClicks = 0
  let totalOrders = 0

  if (data && Array.isArray(data)) {
    for (const a of data as Array<{
      views: number
      likes: number
      comments: number
      shares: number
      clicks: number
      orders: number
      gmv: number
    }>) {
      totalGmv += a.gmv || 0
      totalViews += a.views || 0
      totalLikes += a.likes || 0
      totalComments += a.comments || 0
      totalShares += a.shares || 0
      totalClicks += a.clicks || 0
      totalOrders += a.orders || 0
    }
  }

  return {
    totalGmv,
    totalOrders,
    totalViews,
    totalLikes,
    totalComments,
    totalShares,
    avgConversionRate: totalClicks > 0 ? totalOrders / totalClicks : 0,
  }
}

export async function getGMVData(days: number = 30): Promise<GMVDataPoint[]> {
  const supabase = createClient()

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data } = await supabase
    .from('video_analytics')
    .select('recorded_at, gmv, orders, views, clicks')
    .gte('recorded_at', startDate.toISOString())
    .order('recorded_at', { ascending: true })

  if (!data || !Array.isArray(data) || data.length === 0) return []

  type AnalyticsRow = {
    recorded_at: string
    gmv: number
    orders: number
    views: number
    clicks: number
  }

  // Group by date
  const grouped: Record<string, GMVDataPoint> = {}

  for (const row of data as AnalyticsRow[]) {
    const date = new Date(row.recorded_at).toLocaleDateString('ja-JP', {
      month: '2-digit',
      day: '2-digit',
    })

    if (!grouped[date]) {
      grouped[date] = { date, gmv: 0, orders: 0, views: 0, clicks: 0 }
    }

    grouped[date].gmv += row.gmv || 0
    grouped[date].orders += row.orders || 0
    grouped[date].views += row.views || 0
    grouped[date].clicks += row.clicks || 0
  }

  return Object.values(grouped)
}

export async function getVideoPerformance(): Promise<VideoPerformance[]> {
  const supabase = createClient()

  type VideoRow = {
    id: string
    title: string
    content_type: string
    posted_at: string | null
    template: { name: string } | null
  }

  type AnalyticsRow = {
    views: number
    likes: number
    comments: number
    shares: number
    clicks: number
    orders: number
    gmv: number
  }

  const { data: videos } = await supabase
    .from('videos')
    .select(`
      id,
      title,
      content_type,
      posted_at,
      template:templates(name)
    `)
    .eq('status', 'posted')
    .order('posted_at', { ascending: false })
    .limit(20)

  if (!videos || !Array.isArray(videos)) return []

  // バッチクエリで全動画の分析データを一括取得（N+1クエリ最適化）
  const videoIds = (videos as VideoRow[]).map(v => v.id)
  const { data: allAnalytics } = await supabase
    .from('video_analytics')
    .select('video_id, views, likes, comments, shares, clicks, orders, gmv, recorded_at')
    .in('video_id', videoIds)
    .order('recorded_at', { ascending: false })

  // 各動画の最新の分析データをマップ化
  const analyticsMap = new Map<string, AnalyticsRow>()
  if (allAnalytics && Array.isArray(allAnalytics)) {
    for (const a of allAnalytics as (AnalyticsRow & { video_id: string })[]) {
      // 最初に見つかったもの（最新）のみを保持
      if (!analyticsMap.has(a.video_id)) {
        analyticsMap.set(a.video_id, a)
      }
    }
  }

  const result: VideoPerformance[] = []

  for (const video of videos as VideoRow[]) {
    const analytics = analyticsMap.get(video.id)

    if (analytics) {
      const conversionRate = analytics.clicks > 0 ? analytics.orders / analytics.clicks : 0

      result.push({
        id: video.id,
        title: video.title,
        templateType: video.template?.name || video.content_type,
        postedAt: video.posted_at || '',
        views: analytics.views,
        likes: analytics.likes,
        comments: analytics.comments,
        shares: analytics.shares,
        clicks: analytics.clicks,
        orders: analytics.orders,
        gmv: analytics.gmv,
        conversionRate,
        trend: 'stable',
      })
    }
  }

  return result
}

export async function getTemplatePerformance(): Promise<TemplatePerformance[]> {
  const supabase = createClient()

  type TemplateRow = {
    id: string
    name: string
    type: string
    content_type: string
    performance_score: number | null
  }

  type VideoRow = { id: string; template_id: string }

  type AnalyticsRow = {
    video_id: string
    views: number
    clicks: number
    orders: number
    gmv: number
  }

  const { data: templates } = await supabase
    .from('templates')
    .select('id, name, type, content_type, performance_score')

  if (!templates || !Array.isArray(templates)) return []

  const templateList = templates as TemplateRow[]
  const templateIds = templateList.map(t => t.id)

  // バッチクエリ1: 全テンプレートの動画を一括取得
  const { data: allVideos } = await supabase
    .from('videos')
    .select('id, template_id')
    .in('template_id', templateIds)

  const videoList = (allVideos as VideoRow[] | null) || []
  const videoIds = videoList.map(v => v.id)

  // バッチクエリ2: 全動画の分析データを一括取得
  const { data: allAnalytics } = videoIds.length > 0
    ? await supabase
        .from('video_analytics')
        .select('video_id, views, clicks, orders, gmv')
        .in('video_id', videoIds)
    : { data: [] }

  // テンプレートごとの動画IDをマップ化
  const templateVideoMap = new Map<string, string[]>()
  for (const video of videoList) {
    const existing = templateVideoMap.get(video.template_id) || []
    existing.push(video.id)
    templateVideoMap.set(video.template_id, existing)
  }

  // 動画IDごとの分析データをマップ化
  const videoAnalyticsMap = new Map<string, AnalyticsRow[]>()
  if (allAnalytics && Array.isArray(allAnalytics)) {
    for (const a of allAnalytics as AnalyticsRow[]) {
      const existing = videoAnalyticsMap.get(a.video_id) || []
      existing.push(a)
      videoAnalyticsMap.set(a.video_id, existing)
    }
  }

  const result: TemplatePerformance[] = []

  for (const template of templateList) {
    const videoIdsForTemplate = templateVideoMap.get(template.id) || []
    const videoCount = videoIdsForTemplate.length

    if (videoCount === 0) continue

    let totalViews = 0
    let totalClicks = 0
    let totalOrders = 0
    let totalGmv = 0

    for (const videoId of videoIdsForTemplate) {
      const analyticsForVideo = videoAnalyticsMap.get(videoId) || []
      for (const a of analyticsForVideo) {
        totalViews += a.views || 0
        totalClicks += a.clicks || 0
        totalOrders += a.orders || 0
        totalGmv += a.gmv || 0
      }
    }

    const avgConversionRate = totalClicks > 0 ? totalOrders / totalClicks : 0

    result.push({
      id: template.id,
      name: template.name,
      type: template.type as 'remotion' | 'heygen' | 'ffmpeg',
      contentType: template.content_type,
      videoCount,
      totalViews,
      totalGmv,
      avgConversionRate,
      performanceScore: template.performance_score || 0,
    })
  }

  return result.sort((a, b) => b.totalGmv - a.totalGmv)
}
