'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  FolderOpen,
  Grid3X3,
  List,
  Search,
  Filter,
  Image as ImageIcon,
  Video,
  Music,
  Heart,
  MoreVertical,
  Download,
  Trash2,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { GenerateSidebar } from '@/components/generate/GenerateSidebar'
import { useVideos } from '@/hooks/useVideos'

type ViewMode = 'grid' | 'list'
type AssetType = 'all' | 'images' | 'videos' | 'audio' | 'favorites'

export default function AssetsPage() {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [assetType, setAssetType] = useState<AssetType>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const { data: videos, isLoading } = useVideos()

  // Filter videos that have remote_url (generated videos)
  const assets = videos?.filter((v) => v.remote_url) || []

  const filteredAssets = assets.filter((asset) => {
    if (searchQuery) {
      return asset.title.toLowerCase().includes(searchQuery.toLowerCase())
    }
    return true
  })

  const assetTabs = [
    { value: 'all', label: 'すべて', icon: Grid3X3 },
    { value: 'images', label: '画像', icon: ImageIcon },
    { value: 'videos', label: '動画', icon: Video },
    { value: 'audio', label: '音声', icon: Music },
    { value: 'favorites', label: 'お気に入り', icon: Heart },
  ]

  return (
    <div className="flex h-screen bg-zinc-950">
      <GenerateSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-emerald-400" />
              アセット管理
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                type="text"
                placeholder="アセットを検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 pl-10 bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500"
              />
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 p-1 bg-zinc-800 rounded-lg">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-2',
                  viewMode === 'grid'
                    ? 'bg-zinc-700 text-white'
                    : 'text-zinc-400 hover:text-white'
                )}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-2',
                  viewMode === 'list'
                    ? 'bg-zinc-700 text-white'
                    : 'text-zinc-400 hover:text-white'
                )}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="px-6 py-3 border-b border-zinc-800">
          <Tabs value={assetType} onValueChange={(v) => setAssetType(v as AssetType)}>
            <TabsList className="bg-transparent gap-2">
              {assetTabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg transition-all',
                    'data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400',
                    'data-[state=inactive]:text-zinc-400 data-[state=inactive]:hover:text-white'
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <FolderOpen className="h-16 w-16 text-zinc-700 mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                アセットがありません
              </h3>
              <p className="text-zinc-500 mb-4">
                動画を生成すると、ここに表示されます
              </p>
              <Button
                onClick={() => router.push('/generate')}
                className="bg-emerald-500 hover:bg-emerald-600"
              >
                動画を生成する
              </Button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="group relative bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer"
                  onClick={() => router.push(`/videos/${asset.id}`)}
                >
                  {/* Thumbnail */}
                  <div className="aspect-[9/16] bg-zinc-800 relative">
                    {asset.remote_url ? (
                      <video
                        src={asset.remote_url}
                        className="w-full h-full object-cover"
                        muted
                        onMouseEnter={(e) => e.currentTarget.play()}
                        onMouseLeave={(e) => {
                          e.currentTarget.pause()
                          e.currentTarget.currentTime = 0
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="h-8 w-8 text-zinc-600" />
                      </div>
                    )}

                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button size="sm" variant="secondary">
                        詳細を見る
                      </Button>
                    </div>

                    {/* Duration badge */}
                    {asset.duration_seconds && (
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/70 text-white text-xs rounded">
                        {asset.duration_seconds}s
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {asset.title}
                        </p>
                        <p className="text-xs text-zinc-500 mt-1">
                          {new Date(asset.created_at).toLocaleDateString('ja-JP')}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1 h-auto text-zinc-400 hover:text-white"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-zinc-800 border-zinc-700">
                          <DropdownMenuItem className="text-zinc-300 hover:text-white">
                            <Download className="h-4 w-4 mr-2" />
                            ダウンロード
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-400 hover:text-red-300">
                            <Trash2 className="h-4 w-4 mr-2" />
                            削除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="flex items-center gap-4 p-4 bg-zinc-900 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer"
                  onClick={() => router.push(`/videos/${asset.id}`)}
                >
                  {/* Thumbnail */}
                  <div className="w-24 h-14 bg-zinc-800 rounded-lg overflow-hidden flex-shrink-0">
                    {asset.remote_url ? (
                      <video
                        src={asset.remote_url}
                        className="w-full h-full object-cover"
                        muted
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="h-6 w-6 text-zinc-600" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{asset.title}</p>
                    <p className="text-sm text-zinc-500">
                      {asset.duration_seconds}秒 ・{' '}
                      {new Date(asset.created_at).toLocaleDateString('ja-JP')}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-red-400">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
