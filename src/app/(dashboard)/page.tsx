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
} from 'lucide-react'

const stats = [
  {
    title: '総GMV',
    value: '¥0',
    change: '+0%',
    icon: DollarSign,
    trend: 'up',
  },
  {
    title: '動画数',
    value: '0',
    change: '+0',
    icon: Video,
    trend: 'up',
  },
  {
    title: '商品数',
    value: '0',
    change: '+0',
    icon: Package,
    trend: 'up',
  },
  {
    title: 'エンゲージメント率',
    value: '0%',
    change: '+0%',
    icon: TrendingUp,
    trend: 'up',
  },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">ダッシュボード</h1>
          <p className="text-zinc-400">TikTok Shop GMV最大化プラットフォーム</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="border-zinc-700">
            <Package className="mr-2 h-4 w-4" />
            商品を追加
          </Button>
          <Button className="bg-pink-500 hover:bg-pink-600">
            <Plus className="mr-2 h-4 w-4" />
            動画を生成
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
              <div className="flex items-center gap-1 text-xs text-green-500">
                <ArrowUpRight className="h-3 w-3" />
                {stat.change} 先月比
              </div>
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
            <Button variant="ghost" size="sm" className="text-zinc-400">
              すべて表示
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Video className="h-12 w-12 text-zinc-700 mb-4" />
              <p className="text-zinc-400">まだ動画がありません</p>
              <p className="text-sm text-zinc-500 mt-1">
                商品を追加して動画を生成しましょう
              </p>
              <Button className="mt-4 bg-pink-500 hover:bg-pink-600">
                <Plus className="mr-2 h-4 w-4" />
                最初の動画を作成
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white">トップ商品</CardTitle>
            <Button variant="ghost" size="sm" className="text-zinc-400">
              すべて表示
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Package className="h-12 w-12 text-zinc-700 mb-4" />
              <p className="text-zinc-400">まだ商品がありません</p>
              <p className="text-sm text-zinc-500 mt-1">
                商品を登録してバズ動画を作成しましょう
              </p>
              <Button className="mt-4" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                商品を追加
              </Button>
            </div>
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
            <Card className="bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800 transition-colors cursor-pointer">
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
            <Card className="bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800 transition-colors cursor-pointer">
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
            <Card className="bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800 transition-colors cursor-pointer">
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
