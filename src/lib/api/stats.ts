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
  const result: TopProduct[] = []

  for (const product of productList) {
    // Get video count for this product
    const { count: videoCount } = await supabase
      .from('videos')
      .select('*', { count: 'exact', head: true })
      .eq('product_id', product.id)

    // Get GMV for this product's videos
    const { data: videoIds } = await supabase
      .from('videos')
      .select('id')
      .eq('product_id', product.id)

    const videoIdList = (videoIds as VideoIdRow[] | null) ?? []
    let totalGMV = 0

    if (videoIdList.length > 0) {
      const { data: analytics } = await supabase
        .from('video_analytics')
        .select('gmv')
        .in(
          'video_id',
          videoIdList.map((v) => v.id)
        )

      const analyticsList = (analytics as GmvRow[] | null) ?? []
      totalGMV = analyticsList.reduce((sum, a) => sum + (a.gmv || 0), 0)
    }

    result.push({
      id: product.id,
      name: product.name,
      images: product.images,
      video_count: videoCount ?? 0,
      total_gmv: totalGMV,
    })
  }

  return result.sort((a, b) => b.total_gmv - a.total_gmv)
}
