'use client'

import { useState, useRef, useCallback } from 'react'
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
  Layers,
  Move,
  RefreshCw,
  ImagePlus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ModeType = 'text-to-video' | 'image-to-video' | 'motion-control' | 'elements'

interface Tag {
  id: string
  type: 'subject' | 'image' | 'video'
  name: string
  thumbnail?: string
}

interface GenerateInputPanelProps {
  prompt: string
  setPrompt: (prompt: string) => void
  isGenerating: boolean
  onGenerate: () => void
}

const modes = [
  { id: 'text-to-video' as ModeType, name: 'テキストから動画へ', icon: Wand2 },
  { id: 'image-to-video' as ModeType, name: '画像から動画へ', icon: ImagePlus, badge: '10%OFF' },
  { id: 'motion-control' as ModeType, name: 'モーションコントロール', icon: Move },
  { id: 'elements' as ModeType, name: 'エレメンツ', icon: Layers },
]

const modelOptions = [
  { id: 'kling-2.6', name: '動画 2.6', badge: 'Audio', hasAudio: true },
  { id: 'kling-2.5', name: '動画 2.5 Turbo' },
  { id: 'kling-2.1', name: '動画 2.1' },
  { id: 'kling-o1', name: '動画 O1', badge: 'NEW' },
  { id: 'kling-1.6', name: '動画 1.6' },
  { id: 'kling-1.5', name: '動画 1.5' },
]

const qualityOptions = [
  { id: 'high', name: '高品質モード', badge: 'VIP' },
  { id: 'standard', name: '標準' },
]

const durationOptions = ['5s', '10s']
const countOptions = ['1本', '2本', '4本']

export function GenerateInputPanel({
  prompt,
  setPrompt,
  isGenerating,
  onGenerate,
}: GenerateInputPanelProps) {
  const [activeMode, setActiveMode] = useState<ModeType>('image-to-video')
  const [model, setModel] = useState('kling-2.6')
  const [quality, setQuality] = useState('high')
  const [duration, setDuration] = useState('5s')
  const [count, setCount] = useState('1本')
  const [showModelDropdown, setShowModelDropdown] = useState(false)
  const [showQualityDropdown, setShowQualityDropdown] = useState(false)
  const [enableAudioSync, setEnableAudioSync] = useState(true)
  const [startFrame, setStartFrame] = useState<string | null>(null)
  const [endFrame, setEndFrame] = useState<string | null>(null)
  const [voiceTag, setVoiceTag] = useState<string | null>(null)
  const startFrameRef = useRef<HTMLInputElement>(null)
  const endFrameRef = useRef<HTMLInputElement>(null)

  const selectedModel = modelOptions.find((m) => m.id === model)

  const handleFileUpload = useCallback((
    e: React.ChangeEvent<HTMLInputElement>,
    setImage: (url: string | null) => void
  ) => {
    const file = e.target.files?.[0]
    if (file) {
      setImage(URL.createObjectURL(file))
    }
    e.target.value = ''
  }, [])

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
            <div className="absolute top-full left-0 mt-1 w-48 bg-zinc-800 rounded-lg shadow-xl border border-zinc-700 overflow-hidden z-20">
              {modelOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setModel(opt.id)
                    setShowModelDropdown(false)
                  }}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-zinc-700 transition-colors',
                    model === opt.id ? 'text-emerald-400' : 'text-zinc-300'
                  )}
                >
                  <span>{opt.name}</span>
                  {opt.badge && (
                    <span className={cn(
                      'px-1.5 py-0.5 text-[10px] rounded',
                      opt.badge === 'Audio' ? 'bg-emerald-500 text-white' : 'bg-pink-500 text-white'
                    )}>
                      {opt.badge}
                    </span>
                  )}
                </button>
              ))}
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
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setStartFrame(null)
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
                  onChange={(e) => handleFileUpload(e, setStartFrame)}
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
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setEndFrame(null)
                        }}
                        className="absolute top-2 right-2 p-1 bg-black/50 rounded-full hover:bg-black/70"
                      >
                        <X className="h-4 w-4 text-white" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <ImagePlus className="h-8 w-8 text-zinc-600 mb-2" />
                      <span className="text-sm text-zinc-500">音画同期機能：エンドフレーム</span>
                      <span className="text-xs text-zinc-600">は非対応</span>
                    </>
                  )}
                </button>
                <input
                  ref={endFrameRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, setEndFrame)}
                  className="hidden"
                />
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-zinc-500 leading-relaxed">
              キャラクターのセリフ・歌唱内容は「」で囲み、話し手の直後に @音色 を付けて、音声をより確実に結びつけてください。例：司会者 @温かい女性の声 が「遠くの星を見て」と言う。現在、中国語と英語のテキストで最適な効果が得られます。
              <span className="text-emerald-500 hover:underline cursor-pointer ml-1">
                動画 2.6 機能マニュアル
              </span>
              をクリックして、より多くのプロンプト作成テクニックを学びましょう。
            </p>

            {/* Voice Tag */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800 rounded-lg">
                <Volume2 className="h-4 w-4 text-pink-400" />
                <span className="text-sm text-zinc-300">@音色を選択</span>
              </div>
              <div className="flex-1" />
              <span className="text-xs text-zinc-600">DeepSeek</span>
            </div>

            {/* Audio Sync Toggle */}
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-800 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-300">音声と映像の同期</span>
                <span className="text-zinc-600 text-xs">ⓘ</span>
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
          </div>
        )}

        {/* Text to Video Mode Content */}
        {activeMode === 'text-to-video' && (
          <div className="p-6 space-y-6">
            {/* Prompt Input */}
            <div>
              <label className="block text-sm text-zinc-400 mb-2">プロンプト（必須）</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="生成したい動画の内容を詳しく説明してください..."
                className="w-full h-40 bg-zinc-800 text-white placeholder-zinc-600 rounded-xl p-4 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
              />
            </div>

            {/* Prompt Suggestions */}
            <div className="space-y-2">
              <span className="text-xs text-zinc-500">おすすめ：</span>
              <div className="flex flex-wrap gap-2">
                {['奇妙な虚実', '感情映画', '庄園からの脱出', '猫耳少年'].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setPrompt(suggestion)}
                    className="px-3 py-1.5 bg-zinc-800 text-zinc-400 rounded-full text-sm hover:bg-zinc-700 hover:text-zinc-300 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
                <button className="p-1.5 bg-zinc-800 text-zinc-500 rounded-full hover:bg-zinc-700 transition-colors">
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Motion Control Mode */}
        {activeMode === 'motion-control' && (
          <div className="p-6 space-y-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Move className="h-12 w-12 text-zinc-600 mb-4" />
              <h3 className="text-lg font-medium text-zinc-400 mb-2">モーションコントロール</h3>
              <p className="text-sm text-zinc-500">
                動画の動きやカメラワークを細かく制御できます
              </p>
            </div>
          </div>
        )}

        {/* Elements Mode */}
        {activeMode === 'elements' && (
          <div className="p-6 space-y-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Layers className="h-12 w-12 text-zinc-600 mb-4" />
              <h3 className="text-lg font-medium text-zinc-400 mb-2">エレメンツ</h3>
              <p className="text-sm text-zinc-500">
                複数の画像要素を組み合わせて動画を生成します（最大7枚）
              </p>
            </div>
          </div>
        )}
      </div>

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
            {quality === 'high' && (
              <span className="px-1.5 py-0.5 text-[10px] bg-amber-500 text-white rounded">VIP</span>
            )}
            <ChevronDown className="h-4 w-4 text-zinc-500" />
          </button>
          {showQualityDropdown && (
            <div className="absolute bottom-full left-0 mb-1 w-40 bg-zinc-800 rounded-lg shadow-xl border border-zinc-700 overflow-hidden z-10">
              {qualityOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setQuality(opt.id)
                    setShowQualityDropdown(false)
                  }}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-zinc-700 transition-colors',
                    quality === opt.id ? 'text-emerald-400' : 'text-zinc-300'
                  )}
                >
                  <span>{opt.name}</span>
                  {opt.badge && (
                    <span className="px-1.5 py-0.5 text-[10px] bg-amber-500 text-white rounded">
                      {opt.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Duration */}
        <div className="flex items-center gap-1 px-3 py-2 bg-zinc-800 rounded-lg">
          <select
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="bg-transparent text-sm text-zinc-300 focus:outline-none cursor-pointer"
          >
            {durationOptions.map((opt) => (
              <option key={opt} value={opt} className="bg-zinc-800">
                {opt}
              </option>
            ))}
          </select>
        </div>

        {/* Count */}
        <div className="flex items-center gap-1 px-3 py-2 bg-zinc-800 rounded-lg">
          <select
            value={count}
            onChange={(e) => setCount(e.target.value)}
            className="bg-transparent text-sm text-zinc-300 focus:outline-none cursor-pointer"
          >
            {countOptions.map((opt) => (
              <option key={opt} value={opt} className="bg-zinc-800">
                {opt}
              </option>
            ))}
          </select>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Generate Button */}
        <Button
          onClick={onGenerate}
          disabled={isGenerating || (activeMode === 'image-to-video' && !startFrame)}
          className="px-10 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {isGenerating ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              生成中...
            </span>
          ) : (
            '生成'
          )}
        </Button>
      </div>
    </div>
  )
}
