'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Plus,
  Search,
  Video,
  Clock,
  CheckCircle,
  XCircle,
  Play,
  Upload,
  Loader2,
  Trash2,
  ExternalLink,
  RefreshCw,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { LoginPrompt } from '@/components/auth/LoginPrompt'
import { VideoGenerateModal } from '@/components/video/VideoGenerateModal'
import { useVideos, useDeleteVideo } from '@/hooks/useVideos'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import type { VideoWithProduct } from '@/lib/api/videos'

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

export default function VideosPage() {
  const router = useRouter()
  const { isAuthenticated, loading: authLoading } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null)
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)

  const { data: videos = [], isLoading, error, refetch } = useVideos()
  const deleteVideo = useDeleteVideo()

  const filteredVideos = useMemo(() => {
    let result = videos

    // Filter by tab
    if (activeTab !== 'all') {
      result = result.filter((v) => v.status === activeTab)
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (v) =>
          v.title.toLowerCase().includes(query) ||
          v.product?.name?.toLowerCase().includes(query)
      )
    }

    return result
  }, [videos, activeTab, searchQuery])

  const handleDelete = async () => {
    if (deletingVideoId) {
      try {
        await deleteVideo.mutateAsync(deletingVideoId)
        toast.success('動画を削除しました')
      } catch {
        toast.error('削除に失敗しました')
      }
      setDeletingVideoId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || statusConfig.draft
    const Icon = config.icon
    return (
      <Badge className={`${config.color} text-white`}>
        <Icon className="mr-1 h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  // Show limited UI if not authenticated (allow modal preview but prompt login for actions)
  const showLoginPrompt = !authLoading && !isAuthenticated

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">動画管理</h1>
          <p className="text-zinc-400">生成した動画を管理・投稿</p>
        </div>
        <Button
          className="bg-pink-500 hover:bg-pink-600"
          onClick={() => setIsGenerateModalOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          動画を生成
        </Button>
      </div>

      {/* Login Prompt (shown when not authenticated) */}
      {showLoginPrompt && (
        <LoginPrompt
          title="ログインして動画を管理"
          description="Googleアカウントでログインすると、生成した動画の履歴を保存・管理できます。TikTokへの投稿も可能です。"
        />
      )}

      {/* Tabs (only shown when authenticated) */}
      {!showLoginPrompt && <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="all" className="data-[state=active]:bg-zinc-800">
              すべて ({videos.length})
            </TabsTrigger>
            <TabsTrigger value="draft" className="data-[state=active]:bg-zinc-800">
              下書き ({videos.filter((v) => v.status === 'draft').length})
            </TabsTrigger>
            <TabsTrigger value="ready" className="data-[state=active]:bg-zinc-800">
              準備完了 ({videos.filter((v) => v.status === 'ready').length})
            </TabsTrigger>
            <TabsTrigger value="posted" className="data-[state=active]:bg-zinc-800">
              投稿済み ({videos.filter((v) => v.status === 'posted').length})
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
          </div>
        </div>

        <TabsContent value={activeTab} className="mt-6 animate-in fade-in-50 duration-300">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div
                  key={i}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden animate-in fade-in-50 duration-300"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  {/* Thumbnail Skeleton */}
                  <Skeleton className="aspect-[9/16] w-full bg-zinc-800" />
                  {/* Content Skeleton */}
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-5 w-3/4 bg-zinc-800" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-20 rounded-full bg-zinc-800" />
                      <Skeleton className="h-4 w-12 bg-zinc-800" />
                    </div>
                    <Skeleton className="h-4 w-1/2 bg-zinc-800" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-red-500 mb-2">データの読み込みに失敗しました</p>
                <p className="text-sm text-zinc-500 mb-4">{String(error)}</p>
                <Button
                  variant="outline"
                  onClick={() => refetch()}
                  className="border-zinc-700 hover:bg-zinc-800"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  再読み込み
                </Button>
              </CardContent>
            </Card>
          ) : filteredVideos.length === 0 ? (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Video className="h-16 w-16 text-zinc-700 mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">
                  {searchQuery ? '検索結果がありません' : 'まだ動画がありません'}
                </h3>
                <p className="text-zinc-400 max-w-md mb-6">
                  {searchQuery
                    ? '検索キーワードを変更してください'
                    : '商品を選択してテンプレートを使用し、TikTok向けのバズ動画を自動生成しましょう'}
                </p>
                {!searchQuery && (
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="border-zinc-700"
                      onClick={() => router.push('/products')}
                    >
                      商品を追加
                    </Button>
                    <Button
                      className="bg-pink-500 hover:bg-pink-600"
                      onClick={() => setIsGenerateModalOpen(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      最初の動画を作成
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredVideos.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  onDelete={() => setDeletingVideoId(video.id)}
                  onView={() => router.push(`/videos/${video.id}`)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>}

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

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingVideoId}
        onOpenChange={(open) => !open && setDeletingVideoId(null)}
      >
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

      {/* Video Generate Modal */}
      <VideoGenerateModal
        open={isGenerateModalOpen}
        onOpenChange={setIsGenerateModalOpen}
      />
    </div>
  )
}

function VideoCard({
  video,
  onDelete,
  onView,
}: {
  video: VideoWithProduct
  onDelete: () => void
  onView: () => void
}) {
  const config = statusConfig[video.status] || statusConfig.draft
  const Icon = config.icon

  return (
    <Card
      className="bg-zinc-900 border-zinc-800 overflow-hidden group cursor-pointer"
      onClick={onView}
    >
      <div className="relative aspect-[9/16] bg-zinc-800">
        {video.product?.images?.[0] ? (
          <img
            src={video.product.images[0]}
            alt={video.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Video className="h-12 w-12 text-zinc-700" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button
            size="icon"
            variant="secondary"
            className="h-10 w-10"
            onClick={(e) => {
              e.stopPropagation()
              onView()
            }}
          >
            <Play className="h-5 w-5" />
          </Button>
          {video.tiktok_video_id && (
            <Button size="icon" variant="secondary" className="h-10 w-10">
              <ExternalLink className="h-5 w-5" />
            </Button>
          )}
          <Button
            size="icon"
            variant="secondary"
            className="h-10 w-10 hover:bg-red-500"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
        <div className="absolute top-2 right-2">
          <Badge className={`${config.color} text-white`}>
            <Icon className="mr-1 h-3 w-3" />
            {config.label}
          </Badge>
        </div>
      </div>
      <CardContent className="p-4">
        <h3 className="font-medium text-white truncate">{video.title}</h3>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="secondary" className="bg-zinc-800 text-zinc-300">
            {contentTypeLabels[video.content_type] || video.content_type}
          </Badge>
          {video.duration_seconds && (
            <span className="text-xs text-zinc-500">
              {video.duration_seconds}秒
            </span>
          )}
        </div>
        {video.product && (
          <p className="text-xs text-zinc-500 mt-2 truncate">
            {video.product.name}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
