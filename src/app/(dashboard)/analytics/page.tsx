'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GMVChart, MultiMetricChart } from '@/components/analytics/GMVChart'
import { ConversionTable, PerformanceSummary } from '@/components/analytics/ConversionTable'
import { WinningTemplates, RecommendedActions } from '@/components/analytics/WinningTemplates'
import {
  DollarSign,
  TrendingUp,
  Eye,
  Heart,
  ShoppingCart,
  BarChart3,
  Calendar,
  Download,
  Trophy,
  Loader2,
} from 'lucide-react'
import {
  useAnalyticsSummary,
  useGMVData,
  useVideoPerformance,
  useTemplatePerformance,
} from '@/hooks/useAnalytics'

// サンプルデータ（データがない場合のフォールバック）
const sampleGMVData = [
  { date: '12/01', gmv: 0, orders: 0, views: 0, clicks: 0 },
  { date: '12/02', gmv: 0, orders: 0, views: 0, clicks: 0 },
  { date: '12/03', gmv: 0, orders: 0, views: 0, clicks: 0 },
  { date: '12/04', gmv: 0, orders: 0, views: 0, clicks: 0 },
  { date: '12/05', gmv: 0, orders: 0, views: 0, clicks: 0 },
  { date: '12/06', gmv: 0, orders: 0, views: 0, clicks: 0 },
  { date: '12/07', gmv: 0, orders: 0, views: 0, clicks: 0 },
]

export default function AnalyticsPage() {
  const [chartMetric, setChartMetric] = useState<'gmv' | 'orders' | 'views' | 'clicks'>('gmv')

  const { data: summary, isLoading: summaryLoading } = useAnalyticsSummary()
  const { data: gmvData = [], isLoading: gmvLoading } = useGMVData(30)
  const { data: videoPerformance = [], isLoading: videosLoading } = useVideoPerformance()
  const { data: templatePerformance = [], isLoading: templatesLoading } = useTemplatePerformance()

  const hasData = gmvData.length > 0 || videoPerformance.length > 0
  const chartData = gmvData.length > 0 ? gmvData : sampleGMVData

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatNumber = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
    return value.toString()
  }

  const lowPerformers = useMemo(() => {
    return templatePerformance.filter((t) => t.avgConversionRate < 0.01)
  }, [templatePerformance])

  const stats = [
    {
      title: '総GMV',
      value: summary ? formatCurrency(summary.totalGmv) : '¥0',
      icon: DollarSign,
      description: '売上貢献額',
    },
    {
      title: '総再生数',
      value: summary ? formatNumber(summary.totalViews) : '0',
      icon: Eye,
      description: '全動画の合計',
    },
    {
      title: '総エンゲージメント',
      value: summary
        ? formatNumber(summary.totalLikes + summary.totalComments + summary.totalShares)
        : '0',
      icon: Heart,
      description: 'いいね・コメント・シェア',
    },
    {
      title: 'コンバージョン率',
      value: summary ? `${(summary.avgConversionRate * 100).toFixed(2)}%` : '0%',
      icon: ShoppingCart,
      description: '視聴→購入',
    },
  ]

  const isLoading = summaryLoading || gmvLoading || videosLoading || templatesLoading

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">分析</h1>
          <p className="text-zinc-400">動画パフォーマンスとGMV分析</p>
        </div>
        <div className="flex gap-3">
          <span className="inline-flex items-center px-3 py-2 text-sm text-zinc-400 bg-zinc-800 rounded-md">
            <Calendar className="mr-2 h-4 w-4" />
            過去30日
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-zinc-400" />
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-pink-500" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <span className="text-xs text-zinc-500">{stat.description}</span>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* GMV Chart */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">GMV推移</CardTitle>
              <div className="flex gap-2">
                {(['gmv', 'orders', 'clicks'] as const).map((metric) => (
                  <Button
                    key={metric}
                    variant="ghost"
                    size="sm"
                    className={`text-xs ${
                      chartMetric === metric
                        ? 'bg-zinc-700 text-white'
                        : 'text-zinc-400'
                    }`}
                    onClick={() => setChartMetric(metric)}
                  >
                    {metric === 'gmv' ? 'GMV' : metric === 'orders' ? '注文' : 'クリック'}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {gmvLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
              </div>
            ) : (
              <GMVChart data={chartData} metric={chartMetric} />
            )}
          </CardContent>
        </Card>

        {/* Multi Metric Chart */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">マルチ指標比較</CardTitle>
          </CardHeader>
          <CardContent>
            {gmvLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
              </div>
            ) : (
              <MultiMetricChart data={chartData} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Summary */}
      <PerformanceSummary
        totalGmv={summary?.totalGmv || 0}
        totalOrders={summary?.totalOrders || 0}
        totalViews={summary?.totalViews || 0}
        avgConversionRate={summary?.avgConversionRate || 0}
        gmvChange={0}
      />

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Video Performance Table */}
        <Card className="bg-zinc-900 border-zinc-800 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-white">動画パフォーマンス</CardTitle>
          </CardHeader>
          <CardContent>
            {videosLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
              </div>
            ) : videoPerformance.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <DollarSign className="h-12 w-12 text-zinc-700 mb-4" />
                <p className="text-zinc-400">まだデータがありません</p>
                <p className="text-sm text-zinc-500 mt-1">
                  動画を投稿するとパフォーマンスデータが表示されます
                </p>
              </div>
            ) : (
              <Tabs defaultValue="gmv">
                <TabsList className="bg-zinc-800 border-zinc-700">
                  <TabsTrigger value="gmv" className="data-[state=active]:bg-zinc-700">
                    GMV順
                  </TabsTrigger>
                  <TabsTrigger value="views" className="data-[state=active]:bg-zinc-700">
                    再生数順
                  </TabsTrigger>
                  <TabsTrigger value="cvr" className="data-[state=active]:bg-zinc-700">
                    CVR順
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="gmv" className="mt-4">
                  <ConversionTable data={videoPerformance} sortBy="gmv" />
                </TabsContent>
                <TabsContent value="views" className="mt-4">
                  <ConversionTable data={videoPerformance} sortBy="views" />
                </TabsContent>
                <TabsContent value="cvr" className="mt-4">
                  <ConversionTable data={videoPerformance} sortBy="conversionRate" />
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>

        {/* Winning Templates */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <CardTitle className="text-white">勝ちテンプレート分析</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {templatesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
              </div>
            ) : templatePerformance.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Trophy className="h-12 w-12 text-zinc-700 mb-4" />
                <p className="text-zinc-400">まだデータがありません</p>
                <p className="text-sm text-zinc-500 mt-1">
                  テンプレートを使って動画を作成すると
                  <br />
                  パフォーマンス分析が表示されます
                </p>
              </div>
            ) : (
              <>
                <WinningTemplates templates={templatePerformance} />
                <RecommendedActions
                  topTemplate={templatePerformance[0]}
                  lowPerformers={lowPerformers}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
