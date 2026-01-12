'use client'

import { useState, useRef, useEffect } from 'react'
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
  Loader2,
  CheckCircle,
  XCircle,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface GeneratePreviewPanelProps {
  generatedVideoId: string | null
  generatedVideoUrl: string | null
  isGenerating: boolean
  generationProgress?: number
  generationStatus?: string
}

export function GeneratePreviewPanel({
  generatedVideoId,
  generatedVideoUrl,
  isGenerating,
  generationProgress,
  generationStatus,
}: GeneratePreviewPanelProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [filter, setFilter] = useState<'all' | 'image' | 'video' | 'audio'>('all')
  const [showFavorites, setShowFavorites] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
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

  // Auto-play when video is loaded
  useEffect(() => {
    if (generatedVideoUrl && videoRef.current) {
      videoRef.current.play()
      setIsPlaying(true)
    }
  }, [generatedVideoUrl])

  const handleDownload = async () => {
    if (!generatedVideoUrl) return

    try {
      const response = await fetch(generatedVideoUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `kling-video-${Date.now()}.mp4`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download error:', error)
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
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        {/* Generating State */}
        {isGenerating && !generatedVideoUrl && (
          <div className="flex flex-col items-center justify-center text-center max-w-md">
            {/* Animated Progress Ring */}
            <div className="relative w-28 h-28 mb-6">
              <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full" />
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle
                  cx="56"
                  cy="56"
                  r="52"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                  className="text-emerald-500 transition-all duration-500"
                  strokeDasharray={`${(generationProgress ?? 0) * 3.27} 327`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                {(generationProgress ?? 0) < 30 ? (
                  <Sparkles className="h-8 w-8 text-emerald-400 animate-pulse" />
                ) : (generationProgress ?? 0) < 70 ? (
                  <Zap className="h-8 w-8 text-yellow-400 animate-bounce" />
                ) : (
                  <CheckCircle className="h-8 w-8 text-emerald-400 animate-pulse" />
                )}
              </div>
            </div>

            {/* Phase-based messaging */}
            <h3 className="text-xl font-bold text-white mb-2">
              {(generationProgress ?? 0) < 20 && 'AI分析中...'}
              {(generationProgress ?? 0) >= 20 && (generationProgress ?? 0) < 50 && 'フレーム生成中...'}
              {(generationProgress ?? 0) >= 50 && (generationProgress ?? 0) < 80 && '高品質エンコード中...'}
              {(generationProgress ?? 0) >= 80 && 'もう少しで完成！'}
            </h3>

            {/* Micro-goal feedback */}
            <div className="space-y-2 mb-4">
              <p className="text-zinc-400 text-sm">
                {(generationProgress ?? 0) < 20 && '素材を分析しています...'}
                {(generationProgress ?? 0) >= 20 && (generationProgress ?? 0) < 50 && '魅力的なモーションを生成しています'}
                {(generationProgress ?? 0) >= 50 && (generationProgress ?? 0) < 80 && '高品質な映像に仕上げています'}
                {(generationProgress ?? 0) >= 80 && '最終チェック中です'}
              </p>
              {(generationProgress ?? 0) >= 30 && (generationProgress ?? 0) < 80 && (
                <p className="text-xs text-emerald-400/80 animate-pulse">
                  素晴らしい構図が検出されました
                </p>
              )}
            </div>

            {/* Progress bar with percentage */}
            {generationProgress !== undefined && (
              <div className="w-full max-w-xs">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-zinc-400">進捗</span>
                  <span className="text-emerald-400 font-medium">{generationProgress}%</span>
                </div>
                <div className="relative">
                  <Progress value={generationProgress} className="h-2" />
                  {/* Shimmer effect on progress bar */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer rounded-full overflow-hidden" />
                </div>
                {/* Estimated time remaining */}
                <p className="text-xs text-zinc-500 mt-2 text-center">
                  {generationProgress < 50
                    ? '残り約1〜2分'
                    : generationProgress < 80
                    ? '残り約30秒〜1分'
                    : 'まもなく完了'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Generated Video */}
        {generatedVideoUrl && (
          <div className="w-full max-w-2xl">
            {/* Video Info */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/20 rounded-lg">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
                <span className="text-sm text-emerald-400">生成完了</span>
              </div>
            </div>

            {/* Video Player */}
            <div className="relative aspect-[9/16] max-h-[600px] bg-zinc-900 rounded-xl overflow-hidden mx-auto">
              <video
                ref={videoRef}
                src={generatedVideoUrl}
                className="w-full h-full object-contain"
                loop
                playsInline
                onClick={togglePlay}
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
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-2 mt-4">
              <button className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                <ThumbsUp className="h-5 w-5 text-zinc-400" />
              </button>
              <button className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                <ThumbsDown className="h-5 w-5 text-zinc-400" />
              </button>
              <button className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                <Send className="h-5 w-5 text-zinc-400" />
              </button>
              <button
                onClick={handleDownload}
                className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
              >
                <Download className="h-5 w-5 text-zinc-400" />
              </button>
              <button className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                <Star className="h-5 w-5 text-zinc-400" />
              </button>
            </div>
          </div>
        )}

        {/* Failed State */}
        {generationStatus === 'failed' && !isGenerating && (
          <div className="flex flex-col items-center justify-center text-center max-w-md">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
              <XCircle className="h-8 w-8 text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">生成に失敗しました</h3>
            <p className="text-zinc-400 text-sm">
              もう一度お試しください。問題が続く場合はサポートにお問い合わせください。
            </p>
          </div>
        )}

        {/* Empty State */}
        {!isGenerating && !generatedVideoUrl && generationStatus !== 'failed' && (
          <div className="flex flex-col items-center justify-center text-center max-w-md">
            <div className="w-24 h-24 bg-zinc-800 rounded-full flex items-center justify-center mb-6">
              <Sparkles className="h-10 w-10 text-zinc-600" />
            </div>
            <h3 className="text-xl font-bold text-zinc-400 mb-2">動画を生成しましょう</h3>
            <p className="text-zinc-500 text-sm">
              左側のパネルで画像をアップロードするか、プロンプトを入力して「生成」をクリックしてください。
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
