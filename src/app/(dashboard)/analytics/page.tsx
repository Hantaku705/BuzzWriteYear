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
} from 'lucide-react'

// サンプルデータ（実際にはSupabaseから取得）
const sampleGMVData = [
  { date: '12/01', gmv: 45000, orders: 3, views: 12500, clicks: 450 },
  { date: '12/02', gmv: 62000, orders: 5, views: 18200, clicks: 620 },
  { date: '12/03', gmv: 38000, orders: 2, views: 9800, clicks: 280 },
  { date: '12/04', gmv: 89000, orders: 7, views: 25600, clicks: 890 },
  { date: '12/05', gmv: 72000, orders: 6, views: 21000, clicks: 710 },
  { date: '12/06', gmv: 95000, orders: 8, views: 32100, clicks: 950 },
  { date: '12/07', gmv: 118000, orders: 10, views: 41200, clicks: 1180 },
]

const sampleVideoPerformance = [
  {
    id: '1',
    title: '【話題】この美容液がすごい...',
    templateType: '商品紹介',
    postedAt: '2024/12/07 14:30',
    views: 125000,
    likes: 8500,
    comments: 420,
    shares: 890,
    clicks: 3200,
    orders: 45,
    gmv: 157500,
    conversionRate: 0.014,
    trend: 'up' as const,
  },
  {
    id: '2',
    title: 'Before/After 驚きの変化',
    templateType: 'Before/After',
    postedAt: '2024/12/06 18:00',
    views: 89000,
    likes: 6200,
    comments: 310,
    shares: 560,
    clicks: 2100,
    orders: 28,
    gmv: 98000,
    conversionRate: 0.013,
    trend: 'up' as const,
  },
  {
    id: '3',
    title: '正直レビュー #本音',
    templateType: 'レビュー風',
    postedAt: '2024/12/05 12:00',
    views: 56000,
    likes: 4100,
    comments: 280,
    shares: 340,
    clicks: 1400,
    orders: 15,
    gmv: 52500,
    conversionRate: 0.011,
    trend: 'stable' as const,
  },
]

const sampleTemplatePerformance = [
  {
    id: '1',
    name: '商品紹介 - ベーシック',
    type: 'remotion' as const,
    contentType: 'product_intro',
    videoCount: 24,
    totalViews: 890000,
    totalGmv: 485000,
    avgConversionRate: 0.014,
    performanceScore: 0,
  },
  {
    id: '2',
    name: 'Before/After 比較',
    type: 'remotion' as const,
    contentType: 'before_after',
    videoCount: 18,
    totalViews: 620000,
    totalGmv: 312000,
    avgConversionRate: 0.012,
    performanceScore: 0,
  },
  {
    id: '3',
    name: 'レビュー風テキスト',
    type: 'remotion' as const,
    contentType: 'review',
    videoCount: 15,
    totalViews: 420000,
    totalGmv: 189000,
    avgConversionRate: 0.009,
    performanceScore: 0,
  },
  {
    id: '4',
    name: 'UGC風加工',
    type: 'ffmpeg' as const,
    contentType: 'ugc',
    videoCount: 12,
    totalViews: 380000,
    totalGmv: 256000,
    avgConversionRate: 0.013,
    performanceScore: 0,
  },
]

const stats = [
  {
    title: '総GMV',
    value: '¥519,000',
    change: '+23.5%',
    icon: DollarSign,
    description: '売上貢献額',
  },
  {
    title: '総再生数',
    value: '160.4K',
    change: '+18.2%',
    icon: Eye,
    description: '全動画の合計',
  },
  {
    title: '総エンゲージメント',
    value: '21.6K',
    change: '+15.8%',
    icon: Heart,
    description: 'いいね・コメント・シェア',
  },
  {
    title: 'コンバージョン率',
    value: '1.28%',
    change: '+0.12%',
    icon: ShoppingCart,
    description: '視聴→購入',
  },
]

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState('30d')
  const [chartMetric, setChartMetric] = useState<'gmv' | 'orders' | 'views' | 'clicks'>('gmv')

  // データがあるかどうか（実際にはSupabaseから取得してチェック）
  const hasData = true // サンプルデータがあるのでtrue

  const lowPerformers = useMemo(() => {
    return sampleTemplatePerformance.filter((t) => t.avgConversionRate < 0.01)
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">分析</h1>
          <p className="text-zinc-400">動画パフォーマンスとGMV分析</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="border-zinc-700">
            <Calendar className="mr-2 h-4 w-4" />
            期間: 過去30日
          </Button>
          <Button variant="outline" className="border-zinc-700">
            <Download className="mr-2 h-4 w-4" />
            レポート出力
          </Button>
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
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-zinc-500">{stat.description}</span>
                <span className="text-xs text-green-500">{stat.change}</span>
              </div>
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
            {hasData ? (
              <GMVChart data={sampleGMVData} metric={chartMetric} />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BarChart3 className="h-16 w-16 text-zinc-700 mb-4" />
                <p className="text-zinc-400">データがありません</p>
                <p className="text-sm text-zinc-500 mt-1">
                  動画を投稿するとGMVデータが表示されます
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Multi Metric Chart */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">マルチ指標比較</CardTitle>
          </CardHeader>
          <CardContent>
            {hasData ? (
              <MultiMetricChart data={sampleGMVData} />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <TrendingUp className="h-16 w-16 text-zinc-700 mb-4" />
                <p className="text-zinc-400">データがありません</p>
                <p className="text-sm text-zinc-500 mt-1">
                  動画を投稿するとエンゲージメントデータが表示されます
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Summary */}
      <PerformanceSummary
        totalGmv={519000}
        totalOrders={88}
        totalViews={160400}
        avgConversionRate={0.0128}
        gmvChange={0.235}
      />

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Video Performance Table */}
        <Card className="bg-zinc-900 border-zinc-800 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-white">動画パフォーマンス</CardTitle>
          </CardHeader>
          <CardContent>
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
                {hasData ? (
                  <ConversionTable data={sampleVideoPerformance} sortBy="gmv" />
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <DollarSign className="h-12 w-12 text-zinc-700 mb-4" />
                    <p className="text-zinc-400">まだデータがありません</p>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="views" className="mt-4">
                {hasData ? (
                  <ConversionTable data={sampleVideoPerformance} sortBy="views" />
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Eye className="h-12 w-12 text-zinc-700 mb-4" />
                    <p className="text-zinc-400">まだデータがありません</p>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="cvr" className="mt-4">
                {hasData ? (
                  <ConversionTable data={sampleVideoPerformance} sortBy="conversionRate" />
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Heart className="h-12 w-12 text-zinc-700 mb-4" />
                    <p className="text-zinc-400">まだデータがありません</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
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
            {hasData ? (
              <>
                <WinningTemplates templates={sampleTemplatePerformance} />
                <RecommendedActions
                  topTemplate={sampleTemplatePerformance[0]}
                  lowPerformers={lowPerformers}
                />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Trophy className="h-12 w-12 text-zinc-700 mb-4" />
                <p className="text-zinc-400">まだデータがありません</p>
                <p className="text-sm text-zinc-500 mt-1">
                  テンプレートを使って動画を作成すると
                  <br />
                  パフォーマンス分析が表示されます
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
