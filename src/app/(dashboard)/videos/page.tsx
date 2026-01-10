'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Plus,
  Search,
  Video,
  Clock,
  CheckCircle,
  XCircle,
  Play,
  Upload,
  Filter,
} from 'lucide-react'

const statusConfig = {
  draft: { label: '下書き', color: 'bg-zinc-500', icon: Clock },
  generating: { label: '生成中', color: 'bg-yellow-500', icon: Clock },
  ready: { label: '準備完了', color: 'bg-blue-500', icon: CheckCircle },
  posting: { label: '投稿中', color: 'bg-yellow-500', icon: Upload },
  posted: { label: '投稿済み', color: 'bg-green-500', icon: CheckCircle },
  failed: { label: '失敗', color: 'bg-red-500', icon: XCircle },
}

const contentTypeLabels = {
  product_intro: '商品紹介',
  before_after: 'Before/After',
  review: 'レビュー風',
  avatar: 'AIアバター',
  ugc: 'UGC風',
  unboxing: '開封動画',
}

// Mock data - will be replaced with Supabase data
const mockVideos: never[] = []

export default function VideosPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">動画管理</h1>
          <p className="text-zinc-400">生成した動画を管理・投稿</p>
        </div>
        <Button className="bg-pink-500 hover:bg-pink-600">
          <Plus className="mr-2 h-4 w-4" />
          動画を生成
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="all" className="data-[state=active]:bg-zinc-800">
              すべて
            </TabsTrigger>
            <TabsTrigger value="draft" className="data-[state=active]:bg-zinc-800">
              下書き
            </TabsTrigger>
            <TabsTrigger value="ready" className="data-[state=active]:bg-zinc-800">
              準備完了
            </TabsTrigger>
            <TabsTrigger value="posted" className="data-[state=active]:bg-zinc-800">
              投稿済み
            </TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                placeholder="動画を検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64 bg-zinc-900 border-zinc-800"
              />
            </div>
            <Button variant="outline" className="border-zinc-800">
              <Filter className="mr-2 h-4 w-4" />
              フィルター
            </Button>
          </div>
        </div>

        <TabsContent value={activeTab} className="mt-6">
          {mockVideos.length === 0 ? (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Video className="h-16 w-16 text-zinc-700 mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">
                  まだ動画がありません
                </h3>
                <p className="text-zinc-400 max-w-md mb-6">
                  商品を選択してテンプレートを使用し、
                  TikTok向けのバズ動画を自動生成しましょう
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" className="border-zinc-700">
                    商品を追加
                  </Button>
                  <Button className="bg-pink-500 hover:bg-pink-600">
                    <Plus className="mr-2 h-4 w-4" />
                    最初の動画を作成
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {/* Video cards will be mapped here */}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Quick Templates */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">クイックテンプレート</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Object.entries(contentTypeLabels).map(([key, label]) => (
              <Card
                key={key}
                className="bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-500/10">
                      <Play className="h-5 w-5 text-pink-500" />
                    </div>
                    <div>
                      <p className="font-medium text-white">{label}</p>
                      <p className="text-sm text-zinc-400">
                        {key === 'product_intro' && 'Remotion'}
                        {key === 'before_after' && 'Remotion'}
                        {key === 'review' && 'Remotion'}
                        {key === 'avatar' && 'HeyGen'}
                        {key === 'ugc' && 'FFmpeg'}
                        {key === 'unboxing' && 'HeyGen'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
