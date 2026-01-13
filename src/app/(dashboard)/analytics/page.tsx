'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GMVChart, MultiMetricChart } from '@/components/analytics/GMVChart'
import { ConversionTable, PerformanceSummary } from '@/components/analytics/ConversionTable'
import { WinningTemplates, RecommendedActions } from '@/components/analytics/WinningTemplates'
import {
  TrendingUp,
  Eye,
  Heart,
  Share2,
  MessageCircle,
  Calendar,
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
const sampleViewsData = [
  { date: '12/01', views: 0, likes: 0, comments: 0, shares: 0 },
  { date: '12/02', views: 0, likes: 0, comments: 0, shares: 0 },
  { date: '12/03', views: 0, likes: 0, comments: 0, shares: 0 },
  { date: '12/04', views: 0, likes: 0, comments: 0, shares: 0 },
  { date: '12/05', views: 0, likes: 0, comments: 0, shares: 0 },
  { date: '12/06', views: 0, likes: 0, comments: 0, shares: 0 },
  { date: '12/07', views: 0, likes: 0, comments: 0, shares: 0 },
]

export default function AnalyticsPage() {
  const [chartMetric, setChartMetric] = useState<'views' | 'likes' | 'shares'>('views')

  const { data: summary, isLoading: summaryLoading } = useAnalyticsSummary()
  const { data: gmvData = [], isLoading: gmvLoading } = useGMVData(30)
  const { data: videoPerformance = [], isLoading: videosLoading } = useVideoPerformance()
  const { data: templatePerformance = [], isLoading: templatesLoading } = useTemplatePerformance()

  const hasData = gmvData.length > 0 || videoPerformance.length > 0
  const chartData = gmvData.length > 0 ? gmvData : sampleViewsData

  const formatNumber = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
    return value.toString()
  }

  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(2)}%`
  }

  const lowPerformers = useMemo(() => {
    return templatePerformance.filter((t) => t.avgEngagementRate < 0.03)
  }, [templatePerformance])

  // エンゲージメント率計算（いいね+コメント+シェア / 再生数）
  const engagementRate = summary && summary.totalViews > 0
    ? (summary.totalLikes + summary.totalComments + summary.totalShares) / summary.totalViews
    : 0

  const stats = [
    {
      title: '総再生数',
      value: summary ? formatNumber(summary.totalViews) : '0',
      icon: Eye,
      description: '全動画の合計',
    },
    {
      title: '総いいね',
      value: summary ? formatNumber(summary.totalLikes) : '0',
      icon: Heart,
      description: '全動画の合計',
    },
    {
      title: '総エンゲージメント',
      value: summary
        ? formatNumber(summary.totalLikes + summary.totalComments + summary.totalShares)
        : '0',
      icon: Share2,
      description: 'いいね・コメント・シェア',
    },
    {
      title: 'エンゲージメント率',
      value: formatPercent(engagementRate),
      icon: TrendingUp,
      description: 'エンゲージ / 再生数',
    },
  ]

  const isLoading = summaryLoading || gmvLoading || videosLoading || templatesLoading

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">分析</h1>
          <p className="text-zinc-400">動画パフォーマンスと再生数分析</p>
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
        {/* Views Chart */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">再生数推移</CardTitle>
              <div className="flex gap-2">
                {(['views', 'likes', 'shares'] as const).map((metric) => (
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
                    {metric === 'views' ? '再生数' : metric === 'likes' ? 'いいね' : 'シェア'}
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
        totalViews={summary?.totalViews || 0}
        totalLikes={summary?.totalLikes || 0}
        totalComments={summary?.totalComments || 0}
        totalShares={summary?.totalShares || 0}
        avgEngagementRate={engagementRate}
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
                <Eye className="h-12 w-12 text-zinc-700 mb-4" />
                <p className="text-zinc-400">まだデータがありません</p>
                <p className="text-sm text-zinc-500 mt-1">
                  動画を投稿するとパフォーマンスデータが表示されます
                </p>
              </div>
            ) : (
              <Tabs defaultValue="views">
                <TabsList className="bg-zinc-800 border-zinc-700">
                  <TabsTrigger value="views" className="data-[state=active]:bg-zinc-700">
                    再生数順
                  </TabsTrigger>
                  <TabsTrigger value="likes" className="data-[state=active]:bg-zinc-700">
                    いいね順
                  </TabsTrigger>
                  <TabsTrigger value="engagement" className="data-[state=active]:bg-zinc-700">
                    エンゲージ率順
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="views" className="mt-4">
                  <ConversionTable data={videoPerformance} sortBy="views" />
                </TabsContent>
                <TabsContent value="likes" className="mt-4">
                  <ConversionTable data={videoPerformance} sortBy="likes" />
                </TabsContent>
                <TabsContent value="engagement" className="mt-4">
                  <ConversionTable data={videoPerformance} sortBy="engagementRate" />
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
