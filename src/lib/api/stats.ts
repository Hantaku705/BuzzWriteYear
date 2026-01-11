import { createClient } from '@/lib/supabase/client'

export interface DashboardStats {
  totalGMV: number
  totalViews: number
  conversionRate: number
  productCount: number
  videoCount: number
  postedVideoCount: number
}

export interface RecentVideo {
  id: string
  title: string
  status: string
  created_at: string
  product_name: string | null
}

export interface TopProduct {
  id: string
  name: string
  images: string[]
  video_count: number
  total_gmv: number
}

type AnalyticsRow = {
  views: number
  clicks: number
  orders: number
  gmv: number
}

type VideoRow = {
  id: string
  title: string
  status: string
  created_at: string
  product: { name: string } | null
}

type ProductRow = {
  id: string
  name: string
  images: string[]
}

type VideoIdRow = { id: string }
type GmvRow = { gmv: number }

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = createClient()

  // Get product count
  const { count: productCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })

  // Get video count
  const { count: videoCount } = await supabase
    .from('videos')
    .select('*', { count: 'exact', head: true })

  // Get posted video count
  const { count: postedVideoCount } = await supabase
    .from('videos')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'posted')

  // Get analytics aggregates
  const { data: analytics } = await supabase
    .from('video_analytics')
    .select('views, clicks, orders, gmv')

  let totalGMV = 0
  let totalViews = 0
  let totalClicks = 0
  let totalOrders = 0

  if (analytics && Array.isArray(analytics)) {
    for (const a of analytics as AnalyticsRow[]) {
      totalGMV += a.gmv || 0
      totalViews += a.views || 0
      totalClicks += a.clicks || 0
      totalOrders += a.orders || 0
    }
  }

  const conversionRate = totalClicks > 0 ? (totalOrders / totalClicks) * 100 : 0

  return {
    totalGMV,
    totalViews,
    conversionRate,
    productCount: productCount ?? 0,
    videoCount: videoCount ?? 0,
    postedVideoCount: postedVideoCount ?? 0,
  }
}

export async function getRecentVideos(limit: number = 5): Promise<RecentVideo[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('videos')
    .select(
      `
      id,
      title,
      status,
      created_at,
      product:products(name)
    `
    )
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error

  const videos = (data as VideoRow[] | null) ?? []
  return videos.map((v) => ({
    id: v.id,
    title: v.title,
    status: v.status,
    created_at: v.created_at,
    product_name: v.product?.name ?? null,
  }))
}

export async function getTopProducts(limit: number = 5): Promise<TopProduct[]> {
  const supabase = createClient()

  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, images')
    .limit(limit)

  if (error) throw error

  const productList = (products as ProductRow[] | null) ?? []
  if (productList.length === 0) return []

  const productIds = productList.map(p => p.id)

  // バッチクエリ1: 全製品の動画を一括取得（N+1クエリ最適化）
  const { data: allVideos } = await supabase
    .from('videos')
    .select('id, product_id')
    .in('product_id', productIds)

  type VideoWithProduct = { id: string; product_id: string }
  const videoList = (allVideos as VideoWithProduct[] | null) ?? []
  const videoIds = videoList.map(v => v.id)

  // バッチクエリ2: 全動画の分析データを一括取得
  const { data: allAnalytics } = videoIds.length > 0
    ? await supabase
        .from('video_analytics')
        .select('video_id, gmv')
        .in('video_id', videoIds)
    : { data: [] }

  type AnalyticsWithVideo = { video_id: string; gmv: number }
  const analyticsList = (allAnalytics as AnalyticsWithVideo[] | null) ?? []

  // 製品ごとの動画IDをマップ化
  const productVideoMap = new Map<string, string[]>()
  for (const video of videoList) {
    const existing = productVideoMap.get(video.product_id) || []
    existing.push(video.id)
    productVideoMap.set(video.product_id, existing)
  }

  // 動画IDごとのGMVをマップ化
  const videoGmvMap = new Map<string, number>()
  for (const a of analyticsList) {
    const existing = videoGmvMap.get(a.video_id) || 0
    videoGmvMap.set(a.video_id, existing + (a.gmv || 0))
  }

  const result: TopProduct[] = []

  for (const product of productList) {
    const productVideoIds = productVideoMap.get(product.id) || []
    const videoCount = productVideoIds.length

    let totalGMV = 0
    for (const videoId of productVideoIds) {
      totalGMV += videoGmvMap.get(videoId) || 0
    }

    result.push({
      id: product.id,
      name: product.name,
      images: product.images,
      video_count: videoCount,
      total_gmv: totalGMV,
    })
  }

  return result.sort((a, b) => b.total_gmv - a.total_gmv)
}
