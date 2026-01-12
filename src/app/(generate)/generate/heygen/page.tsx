'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  User,
  Volume2,
  ChevronDown,
  Loader2,
  Play,
  Check,
  Search,
  ArrowLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { GenerateSidebar } from '@/components/generate/GenerateSidebar'
import { useHeygenAvatars, useHeygenVoices, type HeyGenAvatar, type HeyGenVoice } from '@/hooks/useHeygenAssets'
import { useHeygenGenerate } from '@/hooks/useHeygenGenerate'
import { useVideoStatus } from '@/hooks/useVideoStatus'

export default function HeyGenGeneratePage() {
  const router = useRouter()
  const [selectedAvatar, setSelectedAvatar] = useState<HeyGenAvatar | null>(null)
  const [selectedVoice, setSelectedVoice] = useState<HeyGenVoice | null>(null)
  const [script, setScript] = useState('')
  const [title, setTitle] = useState('')
  const [avatarSearch, setAvatarSearch] = useState('')
  const [voiceSearch, setVoiceSearch] = useState('')
  const [showVoiceDropdown, setShowVoiceDropdown] = useState(false)
  const [generatedVideoId, setGeneratedVideoId] = useState<string | null>(null)
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null)

  // Fetch avatars and voices
  const { data: avatars, isLoading: avatarsLoading } = useHeygenAvatars()
  const { data: voices, isLoading: voicesLoading } = useHeygenVoices()

  // Generate mutation
  const { mutate: generateVideo, isPending: isGenerating } = useHeygenGenerate()

  // Poll for video status
  const { data: videoStatus } = useVideoStatus(generatedVideoId, {
    enabled: !!generatedVideoId,
    pollInterval: 5000,
  })

  // Update video URL when completed
  useEffect(() => {
    if (videoStatus?.status === 'ready' && videoStatus.remoteUrl && !generatedVideoUrl) {
      setGeneratedVideoUrl(videoStatus.remoteUrl)
      toast.success('動画生成が完了しました')
    }
  }, [videoStatus?.status, videoStatus?.remoteUrl, generatedVideoUrl])

  // Filter avatars
  const filteredAvatars = avatars?.filter((avatar) =>
    avatar.avatar_name.toLowerCase().includes(avatarSearch.toLowerCase())
  ) || []

  // Filter voices - Japanese voices first
  const filteredVoices = voices?.filter((voice) =>
    voice.name.toLowerCase().includes(voiceSearch.toLowerCase()) ||
    voice.language.toLowerCase().includes(voiceSearch.toLowerCase())
  ).sort((a, b) => {
    // Japanese voices first
    if (a.language.includes('Japanese') && !b.language.includes('Japanese')) return -1
    if (!a.language.includes('Japanese') && b.language.includes('Japanese')) return 1
    return 0
  }) || []

  const handleGenerate = useCallback(() => {
    if (!selectedAvatar || !script) {
      toast.error('アバターとスクリプトを入力してください')
      return
    }

    generateVideo(
      {
        avatarId: selectedAvatar.avatar_id,
        script,
        voiceId: selectedVoice?.voice_id,
        title: title || `HeyGen - ${selectedAvatar.avatar_name}`,
      },
      {
        onSuccess: (data) => {
          setGeneratedVideoId(data.video.id)
          toast.success('動画生成を開始しました')
        },
        onError: (error) => {
          toast.error(error.message || '動画生成に失敗しました')
        },
      }
    )
  }, [selectedAvatar, selectedVoice, script, title, generateVideo])

  const canGenerate = selectedAvatar && script && !isGenerating

  return (
    <div className="flex h-screen bg-zinc-950">
      {/* Sidebar */}
      <GenerateSidebar />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Input */}
        <div className="flex flex-col w-[520px] border-r border-zinc-800 bg-zinc-900">
          {/* Header */}
          <div className="flex items-center gap-4 px-6 py-4 border-b border-zinc-800">
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <User className="h-5 w-5 text-purple-400" />
              HeyGen アバター動画
            </h1>
            <span className="px-2 py-0.5 text-[10px] bg-purple-500 text-white rounded">
              AI Avatar
            </span>
          </div>

          {/* Main Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Avatar Selection */}
            <div>
              <label className="block text-sm text-zinc-400 mb-3">アバターを選択</label>

              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  value={avatarSearch}
                  onChange={(e) => setAvatarSearch(e.target.value)}
                  placeholder="アバターを検索..."
                  className="w-full pl-10 pr-4 py-2 bg-zinc-800 text-white placeholder-zinc-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
                />
              </div>

              {/* Avatar Grid */}
              <div className="grid grid-cols-4 gap-3 max-h-[200px] overflow-y-auto">
                {avatarsLoading ? (
                  <div className="col-span-4 flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 text-purple-400 animate-spin" />
                  </div>
                ) : filteredAvatars.length === 0 ? (
                  <div className="col-span-4 text-center py-8 text-zinc-500 text-sm">
                    アバターが見つかりません
                  </div>
                ) : (
                  filteredAvatars.slice(0, 20).map((avatar) => (
                    <button
                      key={avatar.avatar_id}
                      onClick={() => setSelectedAvatar(avatar)}
                      className={cn(
                        'relative aspect-square rounded-lg overflow-hidden border-2 transition-all',
                        selectedAvatar?.avatar_id === avatar.avatar_id
                          ? 'border-purple-500 ring-2 ring-purple-500/30'
                          : 'border-zinc-700 hover:border-zinc-600'
                      )}
                    >
                      <img
                        src={avatar.preview_image_url}
                        alt={avatar.avatar_name}
                        className="w-full h-full object-cover"
                      />
                      {selectedAvatar?.avatar_id === avatar.avatar_id && (
                        <div className="absolute top-1 right-1 p-1 bg-purple-500 rounded-full">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                        <p className="text-[10px] text-white truncate">{avatar.avatar_name}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Voice Selection */}
            <div>
              <label className="block text-sm text-zinc-400 mb-2">ボイスを選択</label>
              <div className="relative">
                <button
                  onClick={() => setShowVoiceDropdown(!showVoiceDropdown)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Volume2 className="h-4 w-4 text-purple-400" />
                    <span className="text-sm text-zinc-300">
                      {selectedVoice ? (
                        <>
                          {selectedVoice.name}
                          <span className="text-zinc-500 ml-2">({selectedVoice.language})</span>
                        </>
                      ) : (
                        'ボイスを選択...'
                      )}
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-zinc-500" />
                </button>

                {showVoiceDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 rounded-lg shadow-xl border border-zinc-700 overflow-hidden z-20">
                    {/* Voice Search */}
                    <div className="p-2 border-b border-zinc-700">
                      <input
                        type="text"
                        value={voiceSearch}
                        onChange={(e) => setVoiceSearch(e.target.value)}
                        placeholder="ボイスを検索..."
                        className="w-full px-3 py-2 bg-zinc-900 text-white placeholder-zinc-500 rounded text-sm focus:outline-none"
                      />
                    </div>

                    {/* Voice List */}
                    <div className="max-h-[200px] overflow-y-auto">
                      {voicesLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 text-purple-400 animate-spin" />
                        </div>
                      ) : filteredVoices.length === 0 ? (
                        <div className="text-center py-4 text-zinc-500 text-sm">
                          ボイスが見つかりません
                        </div>
                      ) : (
                        filteredVoices.slice(0, 20).map((voice) => (
                          <button
                            key={voice.voice_id}
                            onClick={() => {
                              setSelectedVoice(voice)
                              setShowVoiceDropdown(false)
                            }}
                            className={cn(
                              'w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-zinc-700 transition-colors',
                              selectedVoice?.voice_id === voice.voice_id
                                ? 'text-purple-400 bg-purple-500/10'
                                : 'text-zinc-300'
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <span>{voice.name}</span>
                              <span className="text-zinc-500 text-xs">
                                {voice.language} / {voice.gender}
                              </span>
                            </div>
                            {selectedVoice?.voice_id === voice.voice_id && (
                              <Check className="h-4 w-4" />
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Script Input */}
            <div>
              <label className="block text-sm text-zinc-400 mb-2">スクリプト（必須）</label>
              <textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                placeholder="アバターに話させたい内容を入力してください..."
                className="w-full h-40 bg-zinc-800 text-white placeholder-zinc-600 rounded-xl p-4 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
              />
              <div className="flex justify-between mt-2">
                <span className="text-xs text-zinc-500">
                  {script.length} / 5000文字
                </span>
                <span className="text-xs text-zinc-500">
                  推定時間: {Math.ceil(script.length / 150)}秒
                </span>
              </div>
            </div>

            {/* Title Input (Optional) */}
            <div>
              <label className="block text-sm text-zinc-400 mb-2">タイトル（任意）</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="動画のタイトル..."
                className="w-full px-4 py-3 bg-zinc-800 text-white placeholder-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
              />
            </div>
          </div>

          {/* Generation Progress */}
          {isGenerating && videoStatus && (
            <div className="px-6 py-3 border-t border-zinc-800">
              <div className="flex items-center justify-between text-sm text-zinc-400 mb-2">
                <span>生成中...</span>
                <span>{videoStatus.progress || 0}%</span>
              </div>
              <Progress value={videoStatus.progress || 0} className="h-2" />
            </div>
          )}

          {/* Generate Button */}
          <div className="p-4 border-t border-zinc-800">
            <Button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="w-full py-3 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isGenerating ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  生成中...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  アバター動画を生成
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Right Panel - Preview */}
        <div className="flex-1 flex flex-col bg-zinc-950 p-6">
          {/* Preview Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">プレビュー</h2>
            {generatedVideoUrl && (
              <Button
                variant="outline"
                size="sm"
                className="border-zinc-700"
                onClick={() => router.push(`/videos/${generatedVideoId}`)}
              >
                詳細を見る
              </Button>
            )}
          </div>

          {/* Preview Content */}
          <div className="flex-1 flex items-center justify-center">
            {generatedVideoUrl ? (
              <div className="w-[320px] rounded-xl overflow-hidden bg-black shadow-2xl">
                <video
                  src={generatedVideoUrl}
                  controls
                  loop
                  playsInline
                  className="w-full h-auto max-h-[568px] object-contain"
                >
                  お使いのブラウザは動画再生に対応していません。
                </video>
              </div>
            ) : selectedAvatar ? (
              <div className="w-[320px] rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800">
                <div className="aspect-[9/16] relative">
                  <img
                    src={selectedAvatar.preview_image_url}
                    alt={selectedAvatar.avatar_name}
                    className="w-full h-full object-cover"
                  />
                  {isGenerating && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                      <div className="text-center">
                        <Loader2 className="h-12 w-12 text-purple-400 mx-auto mb-4 animate-spin" />
                        <p className="text-white font-medium">生成中...</p>
                        <p className="text-zinc-400 text-sm mt-1">
                          {videoStatus?.message || `${videoStatus?.progress || 0}%`}
                        </p>
                      </div>
                    </div>
                  )}
                  {!isGenerating && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <div className="text-center">
                        <Play className="h-16 w-16 text-white/80 mx-auto mb-2" />
                        <p className="text-white text-sm">
                          {selectedAvatar.avatar_name}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center">
                <User className="h-16 w-16 text-zinc-700 mx-auto mb-4" />
                <p className="text-zinc-500">アバターを選択してください</p>
              </div>
            )}
          </div>

          {/* Selected Info */}
          {selectedAvatar && (
            <div className="mt-6 p-4 bg-zinc-900 rounded-lg border border-zinc-800">
              <h3 className="text-sm font-medium text-white mb-2">選択中</h3>
              <div className="flex items-center gap-4">
                <img
                  src={selectedAvatar.preview_image_url}
                  alt={selectedAvatar.avatar_name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
                <div>
                  <p className="text-white font-medium">{selectedAvatar.avatar_name}</p>
                  {selectedVoice && (
                    <p className="text-zinc-400 text-sm">
                      ボイス: {selectedVoice.name} ({selectedVoice.language})
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
