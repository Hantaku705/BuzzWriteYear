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

  const result: VideoPerformance[] = []

  for (const video of videos as VideoRow[]) {
    const { data: analytics } = await supabase
      .from('video_analytics')
      .select('views, likes, comments, shares, clicks, orders, gmv')
      .eq('video_id', video.id)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single()

    if (analytics) {
      const a = analytics as AnalyticsRow
      const conversionRate = a.clicks > 0 ? a.orders / a.clicks : 0

      result.push({
        id: video.id,
        title: video.title,
        templateType: video.template?.name || video.content_type,
        postedAt: video.posted_at || '',
        views: a.views,
        likes: a.likes,
        comments: a.comments,
        shares: a.shares,
        clicks: a.clicks,
        orders: a.orders,
        gmv: a.gmv,
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

  type VideoIdRow = { id: string }

  type AnalyticsRow = {
    views: number
    clicks: number
    orders: number
    gmv: number
  }

  const { data: templates } = await supabase
    .from('templates')
    .select('id, name, type, content_type, performance_score')

  if (!templates || !Array.isArray(templates)) return []

  const result: TemplatePerformance[] = []

  for (const template of templates as TemplateRow[]) {
    // Get videos using this template
    const { data: videos } = await supabase
      .from('videos')
      .select('id')
      .eq('template_id', template.id)

    const videoList = (videos as VideoIdRow[] | null) || []
    const videoCount = videoList.length

    if (videoCount === 0) continue

    // Get analytics for these videos
    const videoIds = videoList.map((v) => v.id)
    const { data: analytics } = await supabase
      .from('video_analytics')
      .select('views, clicks, orders, gmv')
      .in('video_id', videoIds)

    let totalViews = 0
    let totalClicks = 0
    let totalOrders = 0
    let totalGmv = 0

    if (analytics && Array.isArray(analytics)) {
      for (const a of analytics as AnalyticsRow[]) {
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
