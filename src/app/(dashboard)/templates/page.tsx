'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RemotionPreview } from '@/components/video/RemotionPreview'
import type { CompositionId } from '@/remotion/compositions'
import {
  Video,
  Play,
  Star,
  TrendingUp,
  Zap,
} from 'lucide-react'

const templates = [
  {
    id: '1',
    name: '商品紹介 - ベーシック',
    type: 'remotion',
    contentType: 'product_intro',
    description: '商品画像とテキストを組み合わせたシンプルな紹介動画',
    duration: 15,
    usageCount: 0,
    performanceScore: null,
  },
  {
    id: '2',
    name: 'Before/After 比較',
    type: 'remotion',
    contentType: 'before_after',
    description: '使用前後の比較を効果的に見せる分割画面動画',
    duration: 12,
    usageCount: 0,
    performanceScore: null,
  },
  {
    id: '3',
    name: 'レビュー風テキスト',
    type: 'remotion',
    contentType: 'review',
    description: 'ユーザーレビュー風のテキストアニメーション',
    duration: 10,
    usageCount: 0,
    performanceScore: null,
  },
  {
    id: '4',
    name: '特徴リスト',
    type: 'remotion',
    contentType: 'product_intro',
    description: '商品の特徴を箇条書きで表示するリスト形式',
    duration: 15,
    usageCount: 0,
    performanceScore: null,
  },
  {
    id: '5',
    name: 'UGC風加工',
    type: 'ffmpeg',
    contentType: 'ugc',
    description: '手ブレやフィルターで素人撮影感を演出',
    duration: 15,
    usageCount: 0,
    performanceScore: null,
  },
]

const typeColors: Record<string, string> = {
  remotion: 'bg-pink-500/10 text-pink-500',
  heygen: 'bg-blue-500/10 text-blue-500',
  ffmpeg: 'bg-green-500/10 text-green-500',
}

const typeLabels: Record<string, string> = {
  remotion: 'Remotion',
  heygen: 'HeyGen',
  ffmpeg: 'FFmpeg',
}

// テンプレートからRemotionのcompositionIdへのマッピング
const compositionMapping: Record<string, CompositionId> = {
  product_intro: 'ProductIntro',
  before_after: 'BeforeAfter',
  review: 'ReviewText',
  feature_list: 'FeatureList',
}

// サンプル入力データ
const sampleInputProps = {
  title: 'サンプル商品',
  imageUrl: 'https://via.placeholder.com/400x600/18181b/ffffff?text=Sample',
  features: ['特徴1', '特徴2', '特徴3'],
  description: 'これはサンプル商品の説明文です',
  price: '¥1,980',
  rating: 4.5,
}

export default function TemplatesPage() {
  const [previewTemplate, setPreviewTemplate] = useState<typeof templates[0] | null>(null)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">テンプレート</h1>
          <p className="text-zinc-400">動画生成テンプレートを選択</p>
        </div>
      </div>

      {/* Template Categories */}
      <div className="grid gap-6">
        {/* Remotion Templates */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-pink-500" />
            Remotion テンプレート
            <Badge variant="outline" className="ml-2 border-zinc-700">
              高速生成
            </Badge>
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates
              .filter((t) => t.type === 'remotion')
              .map((template) => (
                <Card
                  key={template.id}
                  className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer group"
                >
                  <CardContent className="p-0">
                    {/* Preview Area */}
                    <div className="aspect-video bg-zinc-800 rounded-t-lg flex items-center justify-center relative overflow-hidden">
                      <Video className="h-12 w-12 text-zinc-600" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                          size="sm"
                          className="bg-pink-500 hover:bg-pink-600"
                          onClick={() => setPreviewTemplate(template)}
                        >
                          <Play className="mr-2 h-4 w-4" />
                          プレビュー
                        </Button>
                      </div>
                    </div>
                    {/* Info */}
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-white">{template.name}</h3>
                        <Badge className={typeColors[template.type]}>
                          {typeLabels[template.type]}
                        </Badge>
                      </div>
                      <p className="text-sm text-zinc-400 mb-3">
                        {template.description}
                      </p>
                      <div className="flex items-center justify-between text-xs text-zinc-500">
                        <span>{template.duration}秒</span>
                        <span>使用: {template.usageCount}回</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>

        {/* FFmpeg Templates */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            UGC風テンプレート
            <Badge variant="outline" className="ml-2 border-zinc-700">
              自然な訴求
            </Badge>
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates
              .filter((t) => t.type === 'ffmpeg')
              .map((template) => (
                <Card
                  key={template.id}
                  className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer group"
                >
                  <CardContent className="p-0">
                    {/* Preview Area */}
                    <div className="aspect-video bg-zinc-800 rounded-t-lg flex items-center justify-center relative overflow-hidden">
                      <Video className="h-12 w-12 text-zinc-600" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button size="sm" className="bg-green-500 hover:bg-green-600">
                          <Play className="mr-2 h-4 w-4" />
                          プレビュー
                        </Button>
                      </div>
                    </div>
                    {/* Info */}
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-white">{template.name}</h3>
                        <Badge className={typeColors[template.type]}>
                          {typeLabels[template.type]}
                        </Badge>
                      </div>
                      <p className="text-sm text-zinc-400 mb-3">
                        {template.description}
                      </p>
                      <div className="flex items-center justify-between text-xs text-zinc-500">
                        <span>{template.duration}秒</span>
                        <span>使用: {template.usageCount}回</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>

        {/* Coming Soon - HeyGen */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-blue-500" />
            AIアバター テンプレート
            <Badge variant="outline" className="ml-2 border-yellow-500/50 text-yellow-500">
              Coming Soon
            </Badge>
          </h2>
          <Card className="bg-zinc-900/50 border-zinc-800 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Video className="h-12 w-12 text-zinc-700 mb-4" />
              <p className="text-zinc-400">HeyGen AIアバターテンプレート</p>
              <p className="text-sm text-zinc-500 mt-1">
                AIアバターが商品を紹介する動画テンプレートを準備中
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* プレビューダイアログ */}
      {previewTemplate && (
        <Dialog open onOpenChange={() => setPreviewTemplate(null)}>
          <DialogContent className="max-w-md bg-zinc-900 border-zinc-800">
            <DialogHeader>
              <DialogTitle className="text-white">{previewTemplate.name}</DialogTitle>
            </DialogHeader>
            <div className="flex justify-center">
              {compositionMapping[previewTemplate.contentType] ? (
                <RemotionPreview
                  compositionId={compositionMapping[previewTemplate.contentType]}
                  inputProps={sampleInputProps}
                  width={270}
                  height={480}
                  autoPlay
                  loop
                />
              ) : (
                <div className="aspect-[9/16] w-[270px] bg-zinc-800 rounded-lg flex items-center justify-center">
                  <p className="text-zinc-400 text-sm">プレビュー非対応</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
