import { createClient } from '@/lib/supabase/client'

export interface ViewsDataPoint {
  date: string
  views: number
  likes: number
  comments: number
  shares: number
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
  engagementRate: number
  trend: 'up' | 'down' | 'stable'
}

export interface TemplatePerformance {
  id: string
  name: string
  type: 'remotion' | 'heygen' | 'ffmpeg'
  contentType: string
  videoCount: number
  totalViews: number
  totalLikes: number
  totalShares: number
  avgEngagementRate: number
  performanceScore: number
}

export interface AnalyticsSummary {
  totalViews: number
  totalLikes: number
  totalComments: number
  totalShares: number
}

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const supabase = createClient()

  const { data } = await supabase
    .from('video_analytics')
    .select('views, likes, comments, shares')

  let totalViews = 0
  let totalLikes = 0
  let totalComments = 0
  let totalShares = 0

  if (data && Array.isArray(data)) {
    for (const a of data as Array<{
      views: number
      likes: number
      comments: number
      shares: number
    }>) {
      totalViews += a.views || 0
      totalLikes += a.likes || 0
      totalComments += a.comments || 0
      totalShares += a.shares || 0
    }
  }

  return {
    totalViews,
    totalLikes,
    totalComments,
    totalShares,
  }
}

export async function getGMVData(days: number = 30): Promise<ViewsDataPoint[]> {
  const supabase = createClient()

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data } = await supabase
    .from('video_analytics')
    .select('recorded_at, views, likes, comments, shares')
    .gte('recorded_at', startDate.toISOString())
    .order('recorded_at', { ascending: true })

  if (!data || !Array.isArray(data) || data.length === 0) return []

  type AnalyticsRow = {
    recorded_at: string
    views: number
    likes: number
    comments: number
    shares: number
  }

  // Group by date
  const grouped: Record<string, ViewsDataPoint> = {}

  for (const row of data as AnalyticsRow[]) {
    const date = new Date(row.recorded_at).toLocaleDateString('ja-JP', {
      month: '2-digit',
      day: '2-digit',
    })

    if (!grouped[date]) {
      grouped[date] = { date, views: 0, likes: 0, comments: 0, shares: 0 }
    }

    grouped[date].views += row.views || 0
    grouped[date].likes += row.likes || 0
    grouped[date].comments += row.comments || 0
    grouped[date].shares += row.shares || 0
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
    .select('video_id, views, likes, comments, shares, recorded_at')
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
      // エンゲージメント率 = (いいね + コメント + シェア) / 再生数
      const totalEngagement = analytics.likes + analytics.comments + analytics.shares
      const engagementRate = analytics.views > 0 ? totalEngagement / analytics.views : 0

      result.push({
        id: video.id,
        title: video.title,
        templateType: video.template?.name || video.content_type,
        postedAt: video.posted_at || '',
        views: analytics.views,
        likes: analytics.likes,
        comments: analytics.comments,
        shares: analytics.shares,
        engagementRate,
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
    likes: number
    comments: number
    shares: number
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
        .select('video_id, views, likes, comments, shares')
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
    let totalLikes = 0
    let totalComments = 0
    let totalShares = 0

    for (const videoId of videoIdsForTemplate) {
      const analyticsForVideo = videoAnalyticsMap.get(videoId) || []
      for (const a of analyticsForVideo) {
        totalViews += a.views || 0
        totalLikes += a.likes || 0
        totalComments += a.comments || 0
        totalShares += a.shares || 0
      }
    }

    // エンゲージメント率 = (いいね + コメント + シェア) / 再生数
    const totalEngagement = totalLikes + totalComments + totalShares
    const avgEngagementRate = totalViews > 0 ? totalEngagement / totalViews : 0

    result.push({
      id: template.id,
      name: template.name,
      type: template.type as 'remotion' | 'heygen' | 'ffmpeg',
      contentType: template.content_type,
      videoCount,
      totalViews,
      totalLikes,
      totalShares,
      avgEngagementRate,
      performanceScore: template.performance_score || 0,
    })
  }

  // 再生数順でソート
  return result.sort((a, b) => b.totalViews - a.totalViews)
}
