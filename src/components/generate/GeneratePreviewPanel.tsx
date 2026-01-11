'use client'

import { useState, useRef } from 'react'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Download,
  ThumbsUp,
  ThumbsDown,
  Send,
  MoreHorizontal,
  Star,
  Grid3X3,
  List,
  FolderOpen,
  ImageIcon,
  Copy,
  Sparkles,
  Eye,
  Pencil,
  RotateCcw,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface GeneratePreviewPanelProps {
  generatedVideo: string | null
  isGenerating: boolean
}

interface HistoryItem {
  id: string
  type: 'video' | 'image'
  thumbnail: string
  prompt: string
  model: string
  quality: string
  timestamp: Date
}

// Mock history data
const mockHistory: HistoryItem[] = [
  {
    id: '1',
    type: 'video',
    thumbnail: 'https://picsum.photos/200/356?random=1',
    prompt: 'A clean, minimalist lifestyle scene. On a white marble surface sits a beige tray.',
    model: '動画 2.5 Turbo',
    quality: '高品質',
    timestamp: new Date(),
  },
  {
    id: '2',
    type: 'video',
    thumbnail: 'https://picsum.photos/200/356?random=2',
    prompt: 'The hand slowly moves out of the frame and disappears completely.',
    model: '動画 O1',
    quality: '高品質',
    timestamp: new Date(),
  },
  {
    id: '3',
    type: 'video',
    thumbnail: 'https://picsum.photos/200/356?random=3',
    prompt: 'A beautiful sunset over the ocean with golden light.',
    model: '動画 2.6',
    quality: '標準',
    timestamp: new Date(),
  },
]

export function GeneratePreviewPanel({
  generatedVideo,
  isGenerating,
}: GeneratePreviewPanelProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [filter, setFilter] = useState<'all' | 'image' | 'video' | 'audio'>('all')
  const [showFavorites, setShowFavorites] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(mockHistory[0])
  const videoRef = useRef<HTMLVideoElement>(null)

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        {/* Filters */}
        <div className="flex items-center gap-2">
          {['すべて', '画像', '動画', '音声'].map((item, index) => (
            <button
              key={item}
              onClick={() => setFilter(['all', 'image', 'video', 'audio'][index] as typeof filter)}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
                filter === ['all', 'image', 'video', 'audio'][index]
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              {item}
            </button>
          ))}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showFavorites}
              onChange={(e) => setShowFavorites(e.target.checked)}
              className="rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
            />
            お気に入り作品
          </label>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-1.5 rounded',
                viewMode === 'grid' ? 'bg-zinc-700 text-white' : 'text-zinc-500'
              )}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-1.5 rounded',
                viewMode === 'list' ? 'bg-zinc-700 text-white' : 'text-zinc-500'
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <Button variant="outline" size="sm" className="gap-2 border-zinc-700 text-zinc-300">
            <FolderOpen className="h-4 w-4" />
            アセット管理
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Preview Area */}
        <div className="flex-1 flex flex-col p-6 overflow-y-auto">
          {/* Selected Item Preview */}
          {selectedItem && (
            <div className="mb-6">
              {/* Generation Info */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-2 px-3 py-1 bg-zinc-800 rounded-lg">
                  <ImageIcon className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm text-zinc-300">画像から動画生成</span>
                </div>
                <div className="flex items-center gap-2">
                  <img
                    src={selectedItem.thumbnail}
                    alt=""
                    className="w-6 h-6 rounded object-cover"
                  />
                  <span className="text-sm text-zinc-400">フレームズ</span>
                </div>
                <span className="px-2 py-0.5 bg-zinc-800 rounded text-xs text-zinc-400">
                  {selectedItem.model}
                </span>
                <span className="px-2 py-0.5 bg-zinc-800 rounded text-xs text-zinc-400">
                  {selectedItem.quality}
                </span>
                <div className="flex-1" />
                <button className="p-1.5 hover:bg-zinc-800 rounded transition-colors">
                  <Pencil className="h-4 w-4 text-zinc-500" />
                </button>
                <button className="p-1.5 hover:bg-zinc-800 rounded transition-colors">
                  <RotateCcw className="h-4 w-4 text-zinc-500" />
                </button>
              </div>

              {/* Prompt Display */}
              <div className="relative mb-4">
                <p className="text-sm text-zinc-300 leading-relaxed pr-8">
                  {selectedItem.prompt}
                </p>
                <button className="absolute top-0 right-0 p-1 hover:bg-zinc-800 rounded transition-colors">
                  <Copy className="h-4 w-4 text-zinc-500" />
                </button>
              </div>

              {/* Video Player */}
              <div className="relative aspect-[9/16] max-h-[500px] bg-zinc-900 rounded-xl overflow-hidden">
                {isGenerating ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-4" />
                    <p className="text-zinc-400 text-sm">生成中...</p>
                  </div>
                ) : (
                  <>
                    <img
                      src={selectedItem.thumbnail}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    {/* Video Controls Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={togglePlay}
                          className="p-2 hover:bg-white/20 rounded-full transition-colors"
                        >
                          {isPlaying ? (
                            <Pause className="h-5 w-5 text-white" />
                          ) : (
                            <Play className="h-5 w-5 text-white" />
                          )}
                        </button>
                        <span className="text-sm text-white">00:00 / 00:05</span>
                        <div className="flex-1" />
                        <button
                          onClick={toggleMute}
                          className="p-2 hover:bg-white/20 rounded-full transition-colors"
                        >
                          {isMuted ? (
                            <VolumeX className="h-5 w-5 text-white" />
                          ) : (
                            <Volume2 className="h-5 w-5 text-white" />
                          )}
                        </button>
                        <button className="p-2 hover:bg-white/20 rounded-full transition-colors">
                          <Maximize2 className="h-5 w-5 text-white" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500/20 rounded-full">
                    <Sparkles className="h-4 w-4 text-emerald-400" />
                  </div>
                  <button className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                    <Eye className="h-4 w-4 text-zinc-500" />
                  </button>
                  <button className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                    <span className="text-zinc-500 text-sm">音声</span>
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  <button className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                    <ThumbsUp className="h-4 w-4 text-zinc-500" />
                  </button>
                  <button className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                    <ThumbsDown className="h-4 w-4 text-zinc-500" />
                  </button>
                  <button className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                    <Send className="h-4 w-4 text-zinc-500" />
                  </button>
                  <button className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                    <Download className="h-4 w-4 text-zinc-500" />
                  </button>
                  <button className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                    <MoreHorizontal className="h-4 w-4 text-zinc-500" />
                  </button>
                  <button className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                    <Star className="h-4 w-4 text-zinc-500" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* History Sidebar */}
        <div className="w-20 border-l border-zinc-800 overflow-y-auto py-4">
          <div className="flex flex-col gap-2 px-2">
            {mockHistory.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={cn(
                  'relative aspect-[9/16] rounded-lg overflow-hidden border-2 transition-all hover:opacity-80',
                  selectedItem?.id === item.id
                    ? 'border-emerald-500'
                    : 'border-transparent'
                )}
              >
                <img
                  src={item.thumbnail}
                  alt=""
                  className="w-full h-full object-cover"
                />
                {item.type === 'video' && (
                  <div className="absolute bottom-1 left-1 px-1 py-0.5 bg-black/60 rounded text-[10px] text-white">
                    5s
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
