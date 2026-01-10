'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DollarSign,
  TrendingUp,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  ShoppingCart,
  BarChart3,
  Calendar,
  Download,
} from 'lucide-react'

const stats = [
  {
    title: '総GMV',
    value: '¥0',
    change: '+0%',
    icon: DollarSign,
    description: '売上貢献額',
  },
  {
    title: '総再生数',
    value: '0',
    change: '+0%',
    icon: Eye,
    description: '全動画の合計',
  },
  {
    title: '総エンゲージメント',
    value: '0',
    change: '+0%',
    icon: Heart,
    description: 'いいね・コメント・シェア',
  },
  {
    title: 'コンバージョン率',
    value: '0%',
    change: '+0%',
    icon: ShoppingCart,
    description: '視聴→購入',
  },
]

export default function AnalyticsPage() {
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
            <CardTitle className="text-white">GMV推移</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BarChart3 className="h-16 w-16 text-zinc-700 mb-4" />
              <p className="text-zinc-400">データがありません</p>
              <p className="text-sm text-zinc-500 mt-1">
                動画を投稿するとGMVデータが表示されます
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Engagement Chart */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">エンゲージメント推移</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <TrendingUp className="h-16 w-16 text-zinc-700 mb-4" />
              <p className="text-zinc-400">データがありません</p>
              <p className="text-sm text-zinc-500 mt-1">
                動画を投稿するとエンゲージメントデータが表示されます
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Videos */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">トップパフォーマンス動画</CardTitle>
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
              <TabsTrigger value="engagement" className="data-[state=active]:bg-zinc-700">
                エンゲージメント順
              </TabsTrigger>
            </TabsList>
            <TabsContent value="gmv" className="mt-4">
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <DollarSign className="h-12 w-12 text-zinc-700 mb-4" />
                <p className="text-zinc-400">まだデータがありません</p>
              </div>
            </TabsContent>
            <TabsContent value="views" className="mt-4">
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Eye className="h-12 w-12 text-zinc-700 mb-4" />
                <p className="text-zinc-400">まだデータがありません</p>
              </div>
            </TabsContent>
            <TabsContent value="engagement" className="mt-4">
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Heart className="h-12 w-12 text-zinc-700 mb-4" />
                <p className="text-zinc-400">まだデータがありません</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Template Performance */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">テンプレート別パフォーマンス</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="text-zinc-400">テンプレート</TableHead>
                <TableHead className="text-zinc-400 text-right">使用回数</TableHead>
                <TableHead className="text-zinc-400 text-right">平均再生数</TableHead>
                <TableHead className="text-zinc-400 text-right">平均GMV</TableHead>
                <TableHead className="text-zinc-400 text-right">パフォーマンススコア</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="border-zinc-800">
                <TableCell colSpan={5} className="text-center text-zinc-500 py-8">
                  まだデータがありません
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
