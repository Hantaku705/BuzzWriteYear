'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
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
  LogIn,
} from 'lucide-react'
import { useDashboardStats, useRecentVideos, useTopProducts } from '@/hooks/useStats'
import { useAuth } from '@/hooks/useAuth'

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
  const { isAuthenticated, loading: authLoading } = useAuth()
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
                <div className="space-y-2">
                  <Skeleton className="h-8 w-24 bg-zinc-800" />
                  <Skeleton className="h-4 w-16 bg-zinc-800" />
                </div>
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
            {isAuthenticated && (
              <Button
                variant="ghost"
                size="sm"
                className="text-zinc-400"
                onClick={() => router.push('/videos')}
              >
                すべて表示
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {!authLoading && !isAuthenticated ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pink-500/10 mb-4">
                  <LogIn className="h-6 w-6 text-pink-500" />
                </div>
                <p className="text-zinc-400">ログインして履歴を表示</p>
                <p className="text-sm text-zinc-500 mt-1">
                  動画の履歴を保存・管理できます
                </p>
                <Button
                  className="mt-4 bg-pink-500 hover:bg-pink-600"
                  onClick={() => router.push('/login')}
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  ログイン
                </Button>
              </div>
            ) : videosLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-lg bg-zinc-700" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32 bg-zinc-700" />
                        <Skeleton className="h-3 w-20 bg-zinc-700" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full bg-zinc-700" />
                  </div>
                ))}
              </div>
            ) : recentVideos.length === 0 ? (
              <div className="py-6 space-y-4">
                <div className="text-center mb-4">
                  <Video className="h-10 w-10 text-zinc-600 mx-auto mb-2" />
                  <p className="text-zinc-400 font-medium">動画を作成しましょう</p>
                  <p className="text-xs text-zinc-500">以下のステップで進めてください</p>
                </div>

                {/* ステップ1: 商品登録 */}
                <div className={`p-4 rounded-lg border ${topProducts.length === 0 ? 'bg-pink-500/10 border-pink-500/30' : 'bg-zinc-800/30 border-zinc-700'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${topProducts.length === 0 ? 'bg-pink-500 text-white' : 'bg-green-500 text-white'}`}>
                      {topProducts.length === 0 ? '1' : <CheckCircle className="h-4 w-4" />}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${topProducts.length === 0 ? 'text-white' : 'text-zinc-400'}`}>
                        商品を登録する
                      </p>
                      <p className="text-xs text-zinc-500">URLから自動入力、または手動で登録</p>
                    </div>
                  </div>
                  {topProducts.length === 0 && (
                    <Button
                      className="mt-3 w-full bg-pink-500 hover:bg-pink-600"
                      onClick={() => router.push('/products')}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      商品を登録する
                    </Button>
                  )}
                </div>

                {/* ステップ2: 動画生成 */}
                <div className={`p-4 rounded-lg border ${topProducts.length > 0 ? 'bg-pink-500/10 border-pink-500/30' : 'bg-zinc-800/30 border-zinc-700 opacity-60'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${topProducts.length > 0 ? 'bg-pink-500 text-white' : 'bg-zinc-700 text-zinc-400'}`}>
                      2
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${topProducts.length > 0 ? 'text-white' : 'text-zinc-500'}`}>
                        動画を生成する
                      </p>
                      <p className="text-xs text-zinc-500">
                        {topProducts.length > 0 ? 'AIで商品紹介動画を自動生成' : '商品登録後に利用可能'}
                      </p>
                    </div>
                  </div>
                  {topProducts.length > 0 && (
                    <Button
                      className="mt-3 w-full bg-pink-500 hover:bg-pink-600"
                      onClick={() => router.push('/videos')}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      動画を生成する
                    </Button>
                  )}
                </div>
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
            {isAuthenticated && (
              <Button
                variant="ghost"
                size="sm"
                className="text-zinc-400"
                onClick={() => router.push('/products')}
              >
                すべて表示
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {!authLoading && !isAuthenticated ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pink-500/10 mb-4">
                  <LogIn className="h-6 w-6 text-pink-500" />
                </div>
                <p className="text-zinc-400">ログインして履歴を表示</p>
                <p className="text-sm text-zinc-500 mt-1">
                  商品の履歴を保存・管理できます
                </p>
                <Button
                  className="mt-4"
                  variant="outline"
                  onClick={() => router.push('/login')}
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  ログイン
                </Button>
              </div>
            ) : productsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-lg bg-zinc-700" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-28 bg-zinc-700" />
                        <Skeleton className="h-3 w-16 bg-zinc-700" />
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <Skeleton className="h-5 w-20 bg-zinc-700 ml-auto" />
                      <Skeleton className="h-3 w-8 bg-zinc-700 ml-auto" />
                    </div>
                  </div>
                ))}
              </div>
            ) : topProducts.length === 0 ? (
              <div className="py-6 space-y-4">
                <div className="text-center mb-4">
                  <Package className="h-10 w-10 text-zinc-600 mx-auto mb-2" />
                  <p className="text-zinc-400 font-medium">まず商品を登録しましょう</p>
                  <p className="text-xs text-zinc-500">TikTok Shopの商品URLを入力するだけ</p>
                </div>

                {/* 登録方法の説明 */}
                <div className="p-4 rounded-lg bg-pink-500/10 border border-pink-500/30">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      1
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-white">商品URLを入力</p>
                      <p className="text-xs text-zinc-400 mt-1">
                        Amazon、楽天、TikTok ShopなどのURLから商品情報を自動取得します
                      </p>
                    </div>
                  </div>
                  <Button
                    className="mt-4 w-full bg-pink-500 hover:bg-pink-600"
                    onClick={() => router.push('/products')}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    商品を登録する
                  </Button>
                </div>

                <p className="text-xs text-zinc-500 text-center">
                  登録した商品から自動でバズ動画を生成できます
                </p>
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
