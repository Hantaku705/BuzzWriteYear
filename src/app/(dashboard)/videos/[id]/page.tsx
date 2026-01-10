'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  Upload,
  Loader2,
  Video,
  Trash2,
  ExternalLink,
  Wand2,
  Layers,
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useVideo, useDeleteVideo } from '@/hooks/useVideos'
import { RemotionPreview } from '@/components/video/RemotionPreview'
import { VideoDownloadButton } from '@/components/video/VideoDownloadButton'
import { VariantGenerateModal } from '@/components/video/VariantGenerateModal'
import type { CompositionId } from '@/hooks/useGenerateVideo'

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  draft: { label: '下書き', color: 'bg-zinc-500', icon: Clock },
  generating: { label: '生成中', color: 'bg-yellow-500', icon: Clock },
  ready: { label: '準備完了', color: 'bg-blue-500', icon: CheckCircle },
  posting: { label: '投稿中', color: 'bg-yellow-500', icon: Upload },
  posted: { label: '投稿済み', color: 'bg-green-500', icon: CheckCircle },
  failed: { label: '失敗', color: 'bg-red-500', icon: XCircle },
}

const contentTypeLabels: Record<string, string> = {
  product_intro: '商品紹介',
  before_after: 'Before/After',
  review: 'レビュー風',
  feature_list: '特徴リスト',
  avatar: 'AIアバター',
  ugc: 'UGC風',
  unboxing: '開封動画',
}

const contentTypeToCompositionId: Record<string, CompositionId> = {
  product_intro: 'ProductIntro',
  before_after: 'BeforeAfter',
  review: 'ReviewText',
  feature_list: 'FeatureList',
}

export default function VideoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { data: video, isLoading, error } = useVideo(id)
  const deleteVideo = useDeleteVideo()
  const [variantModalOpen, setVariantModalOpen] = useState(false)

  const handleDelete = async () => {
    await deleteVideo.mutateAsync(id)
    router.push('/videos')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
      </div>
    )
  }

  if (error || !video) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/videos')}
          className="text-zinc-400"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          動画一覧に戻る
        </Button>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Video className="h-16 w-16 text-zinc-700 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              動画が見つかりません
            </h3>
            <p className="text-zinc-400">
              この動画は存在しないか、削除された可能性があります。
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const config = statusConfig[video.status] || statusConfig.draft
  const Icon = config.icon
  const compositionId = contentTypeToCompositionId[video.content_type]
  const inputProps = video.input_props as Record<string, unknown> | null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/videos')}
            className="text-zinc-400"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            戻る
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">{video.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={`${config.color} text-white`}>
                <Icon className="mr-1 h-3 w-3" />
                {config.label}
              </Badge>
              <Badge variant="secondary" className="bg-zinc-800 text-zinc-300">
                {contentTypeLabels[video.content_type] || video.content_type}
              </Badge>
              {video.duration_seconds && (
                <span className="text-sm text-zinc-500">
                  {video.duration_seconds}秒
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {compositionId && inputProps && (
            <VideoDownloadButton
              videoId={id}
              videoUrl={video.remote_url}
              compositionId={compositionId}
              inputProps={inputProps}
              className="border-zinc-700"
            />
          )}
          {video.remote_url && (
            <Button
              variant="outline"
              className="border-zinc-700"
              onClick={() => setVariantModalOpen(true)}
            >
              <Layers className="mr-2 h-4 w-4" />
              バリアント生成
            </Button>
          )}
          {video.tiktok_video_id && (
            <Button variant="outline" className="border-zinc-700">
              <ExternalLink className="mr-2 h-4 w-4" />
              TikTokで見る
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="border-zinc-700 hover:border-red-500 hover:text-red-500">
                <Trash2 className="mr-2 h-4 w-4" />
                削除
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-zinc-900 border-zinc-800">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white">
                  動画を削除しますか？
                </AlertDialogTitle>
                <AlertDialogDescription className="text-zinc-400">
                  この操作は取り消せません。動画ファイルも削除されます。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700">
                  キャンセル
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-500 hover:bg-red-600"
                  disabled={deleteVideo.isPending}
                >
                  {deleteVideo.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    '削除'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Preview */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">プレビュー</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            {compositionId && inputProps ? (
              <RemotionPreview
                compositionId={compositionId}
                inputProps={inputProps}
                width={320}
                height={568}
                autoPlay={false}
                loop={true}
                controls={true}
              />
            ) : (
              <div className="w-[320px] h-[568px] bg-zinc-800 rounded-xl flex items-center justify-center">
                <div className="text-center">
                  <Video className="h-12 w-12 text-zinc-700 mx-auto mb-4" />
                  <p className="text-zinc-500">プレビューを表示できません</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Details */}
        <div className="space-y-6">
          {/* Video Info */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">動画情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-zinc-400">タイトル</p>
                <p className="text-white">{video.title}</p>
              </div>
              <div>
                <p className="text-sm text-zinc-400">コンテンツタイプ</p>
                <p className="text-white">
                  {contentTypeLabels[video.content_type] || video.content_type}
                </p>
              </div>
              <div>
                <p className="text-sm text-zinc-400">長さ</p>
                <p className="text-white">
                  {video.duration_seconds ? `${video.duration_seconds}秒` : '不明'}
                </p>
              </div>
              <div>
                <p className="text-sm text-zinc-400">ステータス</p>
                <Badge className={`${config.color} text-white mt-1`}>
                  <Icon className="mr-1 h-3 w-3" />
                  {config.label}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-zinc-400">作成日時</p>
                <p className="text-white">
                  {new Date(video.created_at).toLocaleString('ja-JP')}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Product Info */}
          {video.product && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">商品情報</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-zinc-800 rounded-lg overflow-hidden flex-shrink-0">
                    {video.product.images?.[0] ? (
                      <img
                        src={video.product.images[0]}
                        alt={video.product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="h-6 w-6 text-zinc-600" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-white">{video.product.name}</p>
                    {video.product.price && (
                      <p className="text-sm text-zinc-400">
                        ¥{video.product.price.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Analytics (if posted) - Analytics data comes from video_analytics table */}
          {video.status === 'posted' && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">パフォーマンス</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-zinc-400 text-sm">
                  分析データは分析ページで確認できます。
                </p>
                <Button
                  variant="outline"
                  className="mt-3 border-zinc-700"
                  onClick={() => router.push('/analytics')}
                >
                  分析ページへ
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Variant Generate Modal */}
      <VariantGenerateModal
        open={variantModalOpen}
        onOpenChange={setVariantModalOpen}
        videoId={id}
        videoTitle={video.title}
        onSuccess={(variantIds) => {
          // バリアント生成成功後、リロードして表示更新
          router.refresh()
        }}
      />
    </div>
  )
}
