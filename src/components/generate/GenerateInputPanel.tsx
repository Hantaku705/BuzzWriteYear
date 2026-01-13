'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Sparkles,
  Plus,
  ImageIcon,
  Video,
  User,
  ChevronDown,
  Settings2,
  ArrowRight,
  X,
  Upload,
  Volume2,
  Wand2,
  RefreshCw,
  ImagePlus,
  Loader2,
  HelpCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useGenerateInputStore } from '@/store/generateInputStore'
import { useUGCStyles } from '@/hooks/useUGCStyles'
import type { KlingModelVersion, KlingAspectRatio, KlingQuality } from '@/types/database'
import type { GenerationParams } from '@/types/ugc-style'

type ModeType = 'text-to-video' | 'image-to-video' | 'motion-control' | 'elements'

interface GenerateInputPanelProps {
  prompt: string
  setPrompt: (prompt: string) => void
  isGenerating: boolean
  generationProgress?: number
  onGenerate: (params: {
    mode: 'image-to-video' | 'text-to-video'
    imageUrl?: string
    imageTailUrl?: string
    prompt: string
    modelVersion: KlingModelVersion
    aspectRatio: KlingAspectRatio
    quality: KlingQuality
    duration: 5 | 10
    enableAudio?: boolean
  }) => void
}

const modes = [
  { id: 'text-to-video' as ModeType, name: 'テキストから動画へ', icon: Wand2 },
  { id: 'image-to-video' as ModeType, name: '画像から動画へ', icon: ImagePlus, badge: '10%OFF' },
]

const modelOptions: { id: KlingModelVersion; name: string; badge?: string; hasAudio?: boolean; description: string }[] = [
  { id: '2.6', name: '動画 2.6', badge: 'Audio', hasAudio: true, description: '最新モデル。音声生成に対応。最も高品質' },
  { id: '2.5', name: '動画 2.5 Turbo', description: '高速生成。バランスの取れた品質' },
  { id: '2.1', name: '動画 2.1', description: '安定した品質。コストパフォーマンス◎' },
  { id: '1.6', name: '動画 1.6', description: '軽量モデル。シンプルな動画向け' },
  { id: '1.5', name: '動画 1.5', description: '基本モデル。低コストで試したい時に' },
]

const qualityOptions: { id: KlingQuality; name: string; badge?: string; description: string }[] = [
  { id: 'pro', name: '高品質モード', badge: 'VIP', description: 'ディテールが細かく、滑らかな動き' },
  { id: 'standard', name: '標準', description: '十分な品質で高速生成' },
]

const durationOptions: { value: 5 | 10; label: string; description: string }[] = [
  { value: 5, label: '5s', description: 'ショート動画に最適' },
  { value: 10, label: '10s', description: '長めの商品紹介に' },
]

const aspectOptions: { value: KlingAspectRatio; label: string; description: string }[] = [
  { value: '9:16', label: '9:16', description: 'TikTok・Instagram向け縦動画' },
  { value: '16:9', label: '16:9', description: 'YouTube向け横動画' },
  { value: '1:1', label: '1:1', description: 'Instagram投稿向け正方形' },
]

export function GenerateInputPanel({
  prompt,
  setPrompt,
  isGenerating,
  generationProgress,
  onGenerate,
}: GenerateInputPanelProps) {
  // 永続化されたストアから設定を読み込み
  const store = useGenerateInputStore()

  const [activeMode, setActiveMode] = useState<ModeType>(store.activeMode)
  const [model, setModel] = useState<KlingModelVersion>(store.model)
  const [quality, setQuality] = useState<KlingQuality>(store.quality)
  const [duration, setDuration] = useState<5 | 10>(store.duration)
  const [aspect, setAspect] = useState<KlingAspectRatio>(store.aspect)
  const [showModelDropdown, setShowModelDropdown] = useState(false)
  const [showQualityDropdown, setShowQualityDropdown] = useState(false)
  const [showShortcutHelp, setShowShortcutHelp] = useState(false)
  const [enableAudioSync, setEnableAudioSync] = useState(store.enableAudioSync)
  const [startFrame, setStartFrame] = useState<string | null>(null)
  const [startFrameUrl, setStartFrameUrl] = useState<string | null>(null)
  const [endFrame, setEndFrame] = useState<string | null>(null)
  const [endFrameUrl, setEndFrameUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(store.selectedUGCStyleId)
  const [showStyleDropdown, setShowStyleDropdown] = useState(false)
  const startFrameRef = useRef<HTMLInputElement>(null)
  const endFrameRef = useRef<HTMLInputElement>(null)

  // Fetch UGC styles
  const { data: ugcStyles } = useUGCStyles()
  const readyStyles = ugcStyles?.filter((s) => s.status === 'ready') || []
  const selectedStyle = readyStyles.find((s) => s.id === selectedStyleId)

  // 初期化完了フラグ
  const isInitialized = useRef(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 設定保存フィードバック（デバウンス）
  const showSaveFeedback = useCallback(() => {
    if (!isInitialized.current) return
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(() => {
      toast.success('設定を保存しました', {
        duration: 1500,
        position: 'bottom-center',
      })
    }, 800)
  }, [])

  // 設定変更時にストアに保存
  useEffect(() => {
    store.setActiveMode(activeMode)
    showSaveFeedback()
  }, [activeMode])
  useEffect(() => {
    store.setModel(model)
    showSaveFeedback()
  }, [model])
  useEffect(() => {
    store.setQuality(quality)
    showSaveFeedback()
  }, [quality])
  useEffect(() => {
    store.setDuration(duration)
    showSaveFeedback()
  }, [duration])
  useEffect(() => {
    store.setAspect(aspect)
    showSaveFeedback()
  }, [aspect])
  useEffect(() => {
    store.setEnableAudioSync(enableAudioSync)
    showSaveFeedback()
  }, [enableAudioSync])
  useEffect(() => {
    store.setSelectedUGCStyleId(selectedStyleId)
    showSaveFeedback()
  }, [selectedStyleId])

  // 初期化完了を少し遅延させる（初回の自動保存メッセージを防ぐ）
  useEffect(() => {
    const timer = setTimeout(() => {
      isInitialized.current = true
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  const selectedModel = modelOptions.find((m) => m.id === model)

  // Upload image to Supabase Storage
  const uploadImage = useCallback(async (file: File): Promise<string> => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('ログインが必要です')
    }

    const fileName = `generate/${user.id}/${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      throw new Error(`アップロードに失敗しました: ${uploadError.message}`)
    }

    const { data: { publicUrl } } = supabase.storage
      .from('videos')
      .getPublicUrl(fileName)

    return publicUrl
  }, [])

  const handleFileUpload = useCallback(async (
    e: React.ChangeEvent<HTMLInputElement>,
    setPreview: (url: string | null) => void,
    setUrl: (url: string | null) => void
  ) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Set preview immediately
    setPreview(URL.createObjectURL(file))
    setIsUploading(true)

    try {
      const uploadedUrl = await uploadImage(file)
      setUrl(uploadedUrl)
      toast.success('画像をアップロードしました')
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('画像のアップロードに失敗しました。もう一度お試しください。')
      setPreview(null)
      setUrl(null)
    } finally {
      setIsUploading(false)
    }

    e.target.value = ''
  }, [uploadImage])

  const handleGenerate = useCallback(() => {
    // Get style prompt suffix if a style is selected
    let finalPrompt = prompt
    if (selectedStyle && selectedStyle.generation_params) {
      const genParams = selectedStyle.generation_params as GenerationParams
      if (genParams.klingPromptSuffix) {
        finalPrompt = prompt ? `${prompt}, ${genParams.klingPromptSuffix}` : genParams.klingPromptSuffix
      }
    }

    if (activeMode === 'image-to-video') {
      if (!startFrameUrl) {
        return
      }
      onGenerate({
        mode: 'image-to-video',
        imageUrl: startFrameUrl,
        imageTailUrl: endFrameUrl || undefined,
        prompt: finalPrompt || 'AI generated video',
        modelVersion: model,
        aspectRatio: aspect,
        quality,
        duration,
        enableAudio: model === '2.6' ? enableAudioSync : undefined,
      })
    } else if (activeMode === 'text-to-video') {
      if (!prompt && !selectedStyle) {
        return
      }
      onGenerate({
        mode: 'text-to-video',
        prompt: finalPrompt || 'AI generated video',
        modelVersion: model,
        aspectRatio: aspect,
        quality,
        duration,
        enableAudio: model === '2.6' ? enableAudioSync : undefined,
      })
    }
  }, [activeMode, startFrameUrl, endFrameUrl, prompt, model, aspect, quality, duration, enableAudioSync, selectedStyle, onGenerate])

  const canGenerate = () => {
    if (isGenerating || isUploading) return false
    if (activeMode === 'image-to-video') return !!startFrameUrl
    // Allow generation with just a style selected (no prompt required if style has prompt suffix)
    if (activeMode === 'text-to-video') return !!prompt || !!selectedStyle
    return false
  }

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+Enter / Ctrl+Enter で生成
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        if (canGenerate()) {
          handleGenerate()
        }
        return
      }

      // Escape でドロップダウンを閉じる
      if (e.key === 'Escape') {
        setShowModelDropdown(false)
        setShowQualityDropdown(false)
        setShowShortcutHelp(false)
        setShowStyleDropdown(false)
        return
      }

      // 数字キー 1-2 でモード切替（Cmd/Ctrl + 数字）
      if ((e.metaKey || e.ctrlKey) && (e.key === '1' || e.key === '2')) {
        e.preventDefault()
        if (e.key === '1') setActiveMode('text-to-video')
        if (e.key === '2') setActiveMode('image-to-video')
        return
      }

      // Cmd/Ctrl + 矢印で品質切替
      if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowUp') {
        e.preventDefault()
        setQuality('pro')
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowDown') {
        e.preventDefault()
        setQuality('standard')
        return
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleGenerate, canGenerate])

  return (
    <div className="flex flex-col w-[520px] border-r border-zinc-800 bg-zinc-900">
      {/* Header with Model Selection */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-zinc-800">
        <h1 className="text-lg font-bold text-white">動画生成</h1>

        {/* Model Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowModelDropdown(!showModelDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
          >
            <span className="text-sm text-zinc-300">{selectedModel?.name}</span>
            {selectedModel?.badge && (
              <span className="px-1.5 py-0.5 text-[10px] bg-emerald-500 text-white rounded">
                {selectedModel.badge}
              </span>
            )}
            <ChevronDown className="h-4 w-4 text-zinc-500" />
          </button>
          {showModelDropdown && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-zinc-800 rounded-lg shadow-xl border border-zinc-700 overflow-hidden z-20">
              {modelOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setModel(opt.id)
                    setShowModelDropdown(false)
                  }}
                  className={cn(
                    'w-full flex flex-col items-start px-3 py-2.5 text-sm hover:bg-zinc-700 transition-colors',
                    model === opt.id ? 'bg-zinc-700/50' : ''
                  )}
                >
                  <div className="flex items-center gap-2 w-full">
                    <span className={model === opt.id ? 'text-emerald-400' : 'text-zinc-300'}>{opt.name}</span>
                    {opt.badge && (
                      <span className={cn(
                        'px-1.5 py-0.5 text-[10px] rounded',
                        opt.badge === 'Audio' ? 'bg-emerald-500 text-white' : 'bg-pink-500 text-white'
                      )}>
                        {opt.badge}
                      </span>
                    )}
                    {model === opt.id && (
                      <span className="ml-auto text-emerald-400">✓</span>
                    )}
                  </div>
                  <span className="text-[11px] text-zinc-500 mt-0.5">{opt.description}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Shortcuts Help */}
        <div className="relative">
          <button
            onClick={() => setShowShortcutHelp(!showShortcutHelp)}
            className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
            title="キーボードショートカット"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
          {showShortcutHelp && (
            <div className="absolute top-full right-0 mt-1 w-64 bg-zinc-800 rounded-lg shadow-xl border border-zinc-700 p-3 z-20">
              <p className="text-xs font-medium text-zinc-300 mb-3">キーボードショートカット</p>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">生成開始</span>
                  <kbd className="px-1.5 py-0.5 bg-zinc-700 text-zinc-300 rounded">⌘↵</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">テキストモード</span>
                  <kbd className="px-1.5 py-0.5 bg-zinc-700 text-zinc-300 rounded">⌘1</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">画像モード</span>
                  <kbd className="px-1.5 py-0.5 bg-zinc-700 text-zinc-300 rounded">⌘2</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">高品質モード</span>
                  <kbd className="px-1.5 py-0.5 bg-zinc-700 text-zinc-300 rounded">⌘↑</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">標準モード</span>
                  <kbd className="px-1.5 py-0.5 bg-zinc-700 text-zinc-300 rounded">⌘↓</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">閉じる</span>
                  <kbd className="px-1.5 py-0.5 bg-zinc-700 text-zinc-300 rounded">Esc</kbd>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex items-center gap-1 px-6 py-3 border-b border-zinc-800 overflow-x-auto">
        {modes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => setActiveMode(mode.id)}
            className={cn(
              'relative flex items-center gap-2 px-4 py-2 text-sm font-medium whitespace-nowrap transition-all',
              activeMode === mode.id
                ? 'text-white border-b-2 border-emerald-500'
                : 'text-zinc-500 hover:text-zinc-300'
            )}
          >
            {mode.name}
            {mode.badge && (
              <span className="px-1.5 py-0.5 text-[10px] bg-pink-500 text-white rounded">
                {mode.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        {/* Image to Video Mode Content */}
        {activeMode === 'image-to-video' && (
          <div className="p-6 space-y-6">
            {/* Frame Upload Area */}
            <div className="flex gap-4">
              {/* Start Frame */}
              <div className="flex-1">
                <button
                  onClick={() => startFrameRef.current?.click()}
                  disabled={isUploading}
                  className={cn(
                    'w-full aspect-video flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all',
                    startFrame
                      ? 'border-emerald-500/50 bg-emerald-500/5'
                      : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/50'
                  )}
                >
                  {startFrame ? (
                    <div className="relative w-full h-full">
                      <img src={startFrame} alt="" className="w-full h-full object-cover rounded-lg" />
                      {isUploading && !startFrameUrl && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                          <Loader2 className="h-8 w-8 text-white animate-spin" />
                        </div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setStartFrame(null)
                          setStartFrameUrl(null)
                        }}
                        className="absolute top-2 right-2 p-1 bg-black/50 rounded-full hover:bg-black/70"
                      >
                        <X className="h-4 w-4 text-white" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <ImagePlus className="h-8 w-8 text-zinc-500 mb-2" />
                      <span className="text-sm text-zinc-400">開始フレーム画像を追加</span>
                      <span className="text-xs text-emerald-500 mt-1 hover:underline">履歴作品</span>
                    </>
                  )}
                </button>
                <input
                  ref={startFrameRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, setStartFrame, setStartFrameUrl)}
                  className="hidden"
                />
              </div>

              {/* Arrow */}
              <div className="flex items-center">
                <div className="p-2 bg-zinc-800 rounded-full">
                  <ArrowRight className="h-4 w-4 text-zinc-500" />
                </div>
              </div>

              {/* End Frame */}
              <div className="flex-1">
                <button
                  onClick={() => endFrameRef.current?.click()}
                  disabled={isUploading}
                  className={cn(
                    'w-full aspect-video flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all',
                    endFrame
                      ? 'border-emerald-500/50 bg-emerald-500/5'
                      : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/50 opacity-60'
                  )}
                >
                  {endFrame ? (
                    <div className="relative w-full h-full">
                      <img src={endFrame} alt="" className="w-full h-full object-cover rounded-lg" />
                      {isUploading && !endFrameUrl && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                          <Loader2 className="h-8 w-8 text-white animate-spin" />
                        </div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setEndFrame(null)
                          setEndFrameUrl(null)
                        }}
                        className="absolute top-2 right-2 p-1 bg-black/50 rounded-full hover:bg-black/70"
                      >
                        <X className="h-4 w-4 text-white" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <ImagePlus className="h-8 w-8 text-zinc-600 mb-2" />
                      <span className="text-sm text-zinc-500">終了画像（任意）</span>
                      <span className="text-xs text-zinc-600 text-center px-2">開始→終了をAIが補間</span>
                    </>
                  )}
                </button>
                <input
                  ref={endFrameRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, setEndFrame, setEndFrameUrl)}
                  className="hidden"
                />
              </div>
            </div>

            {/* Prompt Input for Image-to-Video */}
            <div>
              <label className="block text-sm text-zinc-400 mb-2">プロンプト（任意）</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="動画の動きや雰囲気を説明..."
                className="w-full h-24 bg-zinc-800 text-white placeholder-zinc-600 rounded-xl p-4 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
              />
            </div>

            {/* Aspect Ratio Selection */}
            <div>
              <label className="block text-sm text-zinc-400 mb-2">アスペクト比</label>
              <div className="flex gap-2">
                {aspectOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setAspect(opt.value)}
                    className={cn(
                      'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                      aspect === opt.value
                        ? 'bg-emerald-500 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Audio Sync Toggle (2.6 only) */}
            {model === '2.6' && (
              <div className="flex items-center justify-between px-4 py-3 bg-zinc-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm text-zinc-300">音声生成</span>
                </div>
                <button
                  onClick={() => setEnableAudioSync(!enableAudioSync)}
                  className={cn(
                    'relative w-12 h-6 rounded-full transition-colors',
                    enableAudioSync ? 'bg-emerald-500' : 'bg-zinc-600'
                  )}
                >
                  <div
                    className={cn(
                      'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                      enableAudioSync ? 'translate-x-7' : 'translate-x-1'
                    )}
                  />
                </button>
              </div>
            )}

            {/* UGC Style Selection */}
            <div>
              <label className="block text-sm text-zinc-400 mb-2">UGCスタイル（任意）</label>
              <div className="relative">
                <button
                  onClick={() => setShowStyleDropdown(!showStyleDropdown)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Wand2 className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm text-zinc-300">
                      {selectedStyle ? selectedStyle.name : 'スタイルを選択...'}
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-zinc-500" />
                </button>
                {showStyleDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-zinc-800 rounded-lg shadow-xl border border-zinc-700 z-20">
                    <button
                      onClick={() => {
                        setSelectedStyleId(null)
                        setShowStyleDropdown(false)
                      }}
                      className={cn(
                        'w-full flex items-center px-4 py-2.5 text-sm hover:bg-zinc-700 transition-colors',
                        !selectedStyleId ? 'bg-zinc-700/50 text-emerald-400' : 'text-zinc-400'
                      )}
                    >
                      スタイルなし
                      {!selectedStyleId && <span className="ml-auto">✓</span>}
                    </button>
                    {readyStyles.map((style) => (
                      <button
                        key={style.id}
                        onClick={() => {
                          setSelectedStyleId(style.id)
                          setShowStyleDropdown(false)
                        }}
                        className={cn(
                          'w-full flex flex-col items-start px-4 py-2.5 text-sm hover:bg-zinc-700 transition-colors',
                          selectedStyleId === style.id ? 'bg-zinc-700/50' : ''
                        )}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <span className={selectedStyleId === style.id ? 'text-emerald-400' : 'text-zinc-300'}>
                            {style.name}
                          </span>
                          {selectedStyleId === style.id && (
                            <span className="ml-auto text-emerald-400">✓</span>
                          )}
                        </div>
                        {style.keywords && style.keywords.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {style.keywords.slice(0, 3).map((kw) => (
                              <span key={kw} className="text-[10px] px-1.5 py-0.5 bg-zinc-600 text-zinc-400 rounded">
                                {kw}
                              </span>
                            ))}
                          </div>
                        )}
                      </button>
                    ))}
                    {readyStyles.length === 0 && (
                      <div className="px-4 py-3 text-center">
                        <p className="text-sm text-zinc-500">利用可能なスタイルがありません</p>
                        <a href="/generate/ugc-styles/new" className="text-xs text-emerald-400 hover:underline">
                          スタイルを作成
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {selectedStyle && (
                <p className="text-xs text-zinc-500 mt-2">
                  {selectedStyle.overall_vibe || '学習済みスタイルが適用されます'}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Text to Video Mode Content */}
        {activeMode === 'text-to-video' && (
          <div className="p-6 space-y-6">
            {/* Prompt Input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-zinc-400">プロンプト（必須）</label>
                <span className={cn(
                  'text-xs',
                  prompt.length === 0 ? 'text-zinc-600' :
                  prompt.length < 10 ? 'text-amber-500' :
                  prompt.length > 200 ? 'text-amber-500' :
                  'text-emerald-500'
                )}>
                  {prompt.length}/200
                  {prompt.length > 0 && prompt.length < 10 && ' (もう少し詳しく)'}
                  {prompt.length > 200 && ' (短めに)'}
                </span>
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="例: 商品が回転しながら光が当たり、美しく輝く様子を撮影"
                className="w-full h-32 bg-zinc-800 text-white placeholder-zinc-600 rounded-xl p-4 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
              />
              {prompt.length === 0 && (
                <p className="text-xs text-zinc-500 mt-2">
                  動画に入れたい動き・シーン・雰囲気を説明してください
                </p>
              )}
            </div>

            {/* Aspect Ratio Selection */}
            <div>
              <label className="block text-sm text-zinc-400 mb-2">アスペクト比</label>
              <div className="flex gap-2">
                {aspectOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setAspect(opt.value)}
                    className={cn(
                      'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                      aspect === opt.value
                        ? 'bg-emerald-500 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt Suggestions */}
            <div className="space-y-2">
              <span className="text-xs text-zinc-500">プロンプトの例：</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { text: '商品が回転する', desc: '360度ビュー' },
                  { text: '使用シーンを映す', desc: '日常感' },
                  { text: '手に取って見せる', desc: 'UGC風' },
                  { text: '効果を実演', desc: 'ビフォアフター' },
                ].map((suggestion) => (
                  <button
                    key={suggestion.text}
                    onClick={() => setPrompt(suggestion.text)}
                    className="group px-3 py-1.5 bg-zinc-800 text-zinc-400 rounded-full text-sm hover:bg-zinc-700 hover:text-zinc-300 transition-colors"
                    title={suggestion.desc}
                  >
                    {suggestion.text}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-zinc-600">商品の魅力が伝わる動きを指定してください</p>
            </div>

            {/* Audio Toggle (2.6 only) */}
            {model === '2.6' && (
              <div className="flex items-center justify-between px-4 py-3 bg-zinc-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm text-zinc-300">音声生成</span>
                </div>
                <button
                  onClick={() => setEnableAudioSync(!enableAudioSync)}
                  className={cn(
                    'relative w-12 h-6 rounded-full transition-colors',
                    enableAudioSync ? 'bg-emerald-500' : 'bg-zinc-600'
                  )}
                >
                  <div
                    className={cn(
                      'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                      enableAudioSync ? 'translate-x-7' : 'translate-x-1'
                    )}
                  />
                </button>
              </div>
            )}

            {/* UGC Style Selection */}
            <div>
              <label className="block text-sm text-zinc-400 mb-2">UGCスタイル（任意）</label>
              <div className="relative">
                <button
                  onClick={() => setShowStyleDropdown(!showStyleDropdown)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Wand2 className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm text-zinc-300">
                      {selectedStyle ? selectedStyle.name : 'スタイルを選択...'}
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-zinc-500" />
                </button>
                {showStyleDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-zinc-800 rounded-lg shadow-xl border border-zinc-700 z-20">
                    <button
                      onClick={() => {
                        setSelectedStyleId(null)
                        setShowStyleDropdown(false)
                      }}
                      className={cn(
                        'w-full flex items-center px-4 py-2.5 text-sm hover:bg-zinc-700 transition-colors',
                        !selectedStyleId ? 'bg-zinc-700/50 text-emerald-400' : 'text-zinc-400'
                      )}
                    >
                      スタイルなし
                      {!selectedStyleId && <span className="ml-auto">✓</span>}
                    </button>
                    {readyStyles.map((style) => (
                      <button
                        key={style.id}
                        onClick={() => {
                          setSelectedStyleId(style.id)
                          setShowStyleDropdown(false)
                        }}
                        className={cn(
                          'w-full flex flex-col items-start px-4 py-2.5 text-sm hover:bg-zinc-700 transition-colors',
                          selectedStyleId === style.id ? 'bg-zinc-700/50' : ''
                        )}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <span className={selectedStyleId === style.id ? 'text-emerald-400' : 'text-zinc-300'}>
                            {style.name}
                          </span>
                          {selectedStyleId === style.id && (
                            <span className="ml-auto text-emerald-400">✓</span>
                          )}
                        </div>
                        {style.keywords && style.keywords.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {style.keywords.slice(0, 3).map((kw) => (
                              <span key={kw} className="text-[10px] px-1.5 py-0.5 bg-zinc-600 text-zinc-400 rounded">
                                {kw}
                              </span>
                            ))}
                          </div>
                        )}
                      </button>
                    ))}
                    {readyStyles.length === 0 && (
                      <div className="px-4 py-3 text-center">
                        <p className="text-sm text-zinc-500">利用可能なスタイルがありません</p>
                        <a href="/generate/ugc-styles/new" className="text-xs text-emerald-400 hover:underline">
                          スタイルを作成
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {selectedStyle && (
                <p className="text-xs text-zinc-500 mt-2">
                  {selectedStyle.overall_vibe || '学習済みスタイルが適用されます'}
                </p>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Generation Progress */}
      {isGenerating && generationProgress !== undefined && (
        <div className="px-6 py-3 border-t border-zinc-800">
          <div className="flex items-center justify-between text-sm text-zinc-400 mb-2">
            <span>生成中...</span>
            <span>{generationProgress}%</span>
          </div>
          <Progress value={generationProgress} className="h-2" />
        </div>
      )}

      {/* Bottom Settings Bar */}
      <div className="flex items-center gap-3 p-4 border-t border-zinc-800 bg-zinc-900">
        {/* Quality */}
        <div className="relative">
          <button
            onClick={() => setShowQualityDropdown(!showQualityDropdown)}
            className="flex items-center gap-2 px-3 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
          >
            <span className="text-sm text-zinc-300">
              {qualityOptions.find((q) => q.id === quality)?.name}
            </span>
            {quality === 'pro' && (
              <span className="px-1.5 py-0.5 text-[10px] bg-amber-500 text-white rounded">VIP</span>
            )}
            <ChevronDown className="h-4 w-4 text-zinc-500" />
          </button>
          {showQualityDropdown && (
            <div className="absolute bottom-full left-0 mb-1 w-56 bg-zinc-800 rounded-lg shadow-xl border border-zinc-700 overflow-hidden z-10">
              {qualityOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setQuality(opt.id)
                    setShowQualityDropdown(false)
                  }}
                  className={cn(
                    'w-full flex flex-col items-start px-3 py-2.5 text-sm hover:bg-zinc-700 transition-colors',
                    quality === opt.id ? 'bg-zinc-700/50' : ''
                  )}
                >
                  <div className="flex items-center gap-2 w-full">
                    <span className={quality === opt.id ? 'text-emerald-400' : 'text-zinc-300'}>{opt.name}</span>
                    {opt.badge && (
                      <span className="px-1.5 py-0.5 text-[10px] bg-amber-500 text-white rounded">
                        {opt.badge}
                      </span>
                    )}
                    {quality === opt.id && (
                      <span className="ml-auto text-emerald-400">✓</span>
                    )}
                  </div>
                  <span className="text-[11px] text-zinc-500 mt-0.5">{opt.description}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Duration */}
        <div className="flex items-center gap-1 px-3 py-2 bg-zinc-800 rounded-lg">
          <select
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value) as 5 | 10)}
            className="bg-transparent text-sm text-zinc-300 focus:outline-none cursor-pointer"
          >
            {durationOptions.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-zinc-800">
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={!canGenerate()}
          title="Cmd+Enter / Ctrl+Enter で生成"
          className="px-10 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {isGenerating ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              生成中...
            </span>
          ) : isUploading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              アップロード中...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              生成
              <kbd className="px-1.5 py-0.5 text-[10px] bg-emerald-600 rounded">⌘↵</kbd>
            </span>
          )}
        </Button>
      </div>
    </div>
  )
}
