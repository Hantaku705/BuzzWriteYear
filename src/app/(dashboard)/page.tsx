'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Video,
  Package,
  TrendingUp,
  DollarSign,
  Plus,
  ArrowUpRight,
  Loader2,
  Clock,
  CheckCircle,
} from 'lucide-react'
import { useDashboardStats, useRecentVideos, useTopProducts } from '@/hooks/useStats'

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: '下書き', color: 'bg-zinc-500' },
  generating: { label: '生成中', color: 'bg-yellow-500' },
  ready: { label: '準備完了', color: 'bg-blue-500' },
  posting: { label: '投稿中', color: 'bg-yellow-500' },
  posted: { label: '投稿済み', color: 'bg-green-500' },
  failed: { label: '失敗', color: 'bg-red-500' },
}

export default function DashboardPage() {
  const router = useRouter()
  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: recentVideos = [], isLoading: videosLoading } = useRecentVideos(5)
  const { data: topProducts = [], isLoading: productsLoading } = useTopProducts(5)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatNumber = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`
    }
    return value.toString()
  }

  const statsData = [
    {
      title: '総GMV',
      value: stats ? formatCurrency(stats.totalGMV) : '¥0',
      icon: DollarSign,
    },
    {
      title: '動画数',
      value: stats ? `${stats.videoCount}` : '0',
      subtext: stats ? `投稿済み: ${stats.postedVideoCount}` : '',
      icon: Video,
    },
    {
      title: '商品数',
      value: stats ? `${stats.productCount}` : '0',
      icon: Package,
    },
    {
      title: 'コンバージョン率',
      value: stats ? `${stats.conversionRate.toFixed(1)}%` : '0%',
      subtext: `総再生: ${stats ? formatNumber(stats.totalViews) : '0'}`,
      icon: TrendingUp,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">ダッシュボード</h1>
          <p className="text-zinc-400">TikTok Shop GMV最大化プラットフォーム</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="border-zinc-700"
            onClick={() => router.push('/products')}
          >
            <Package className="mr-2 h-4 w-4" />
            商品を追加
          </Button>
          <Button
            className="bg-pink-500 hover:bg-pink-600"
            onClick={() => router.push('/videos')}
          >
            <Plus className="mr-2 h-4 w-4" />
            動画を生成
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsData.map((stat) => (
          <Card key={stat.title} className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-zinc-400" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-pink-500" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  {stat.subtext && (
                    <div className="text-xs text-zinc-500 mt-1">{stat.subtext}</div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Videos */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white">最近の動画</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-zinc-400"
              onClick={() => router.push('/videos')}
            >
              すべて表示
            </Button>
          </CardHeader>
          <CardContent>
            {videosLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
              </div>
            ) : recentVideos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Video className="h-12 w-12 text-zinc-700 mb-4" />
                <p className="text-zinc-400">まだ動画がありません</p>
                <p className="text-sm text-zinc-500 mt-1">
                  商品を追加して動画を生成しましょう
                </p>
                <Button
                  className="mt-4 bg-pink-500 hover:bg-pink-600"
                  onClick={() => router.push('/videos')}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  最初の動画を作成
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentVideos.map((video) => {
                  const config = statusConfig[video.status] || statusConfig.draft
                  return (
                    <div
                      key={video.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors cursor-pointer"
                      onClick={() => router.push('/videos')}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-700">
                          <Video className="h-5 w-5 text-zinc-400" />
                        </div>
                        <div>
                          <p className="font-medium text-white truncate max-w-[200px]">
                            {video.title}
                          </p>
                          {video.product_name && (
                            <p className="text-xs text-zinc-500">{video.product_name}</p>
                          )}
                        </div>
                      </div>
                      <Badge className={`${config.color} text-white`}>
                        {config.label}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white">トップ商品</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-zinc-400"
              onClick={() => router.push('/products')}
            >
              すべて表示
            </Button>
          </CardHeader>
          <CardContent>
            {productsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
              </div>
            ) : topProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Package className="h-12 w-12 text-zinc-700 mb-4" />
                <p className="text-zinc-400">まだ商品がありません</p>
                <p className="text-sm text-zinc-500 mt-1">
                  商品を登録してバズ動画を作成しましょう
                </p>
                <Button
                  className="mt-4"
                  variant="outline"
                  onClick={() => router.push('/products')}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  商品を追加
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {topProducts.map((product, index) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors cursor-pointer"
                    onClick={() => router.push('/products')}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-700 overflow-hidden">
                        {product.images[0] ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="h-5 w-5 text-zinc-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-white truncate max-w-[200px]">
                          {product.name}
                        </p>
                        <p className="text-xs text-zinc-500">
                          動画: {product.video_count}本
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-white">
                        {formatCurrency(product.total_gmv)}
                      </p>
                      <p className="text-xs text-zinc-500">GMV</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">クイックアクション</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Card
              className="bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800 transition-colors cursor-pointer"
              onClick={() => router.push('/videos')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-500/10">
                    <Video className="h-5 w-5 text-pink-500" />
                  </div>
                  <div>
                    <p className="font-medium text-white">商品紹介動画</p>
                    <p className="text-sm text-zinc-400">Remotionテンプレート</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card
              className="bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800 transition-colors cursor-pointer"
              onClick={() => router.push('/videos')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium text-white">Before/After</p>
                    <p className="text-sm text-zinc-400">比較動画</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card
              className="bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800 transition-colors cursor-pointer"
              onClick={() => router.push('/videos')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                    <Package className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="font-medium text-white">UGC風動画</p>
                    <p className="text-sm text-zinc-400">自然な訴求</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
