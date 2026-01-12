'use client'

import { useState } from 'react'
import {
  ImageIcon,
  Wand2,
  Upload,
  Sparkles,
  Loader2,
  Download,
  RefreshCw,
  Settings2,
  Ratio,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import { GenerateSidebar } from '@/components/generate/GenerateSidebar'
import { toast } from 'sonner'

type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4'

const aspectRatios: { value: AspectRatio; label: string; width: number; height: number }[] = [
  { value: '1:1', label: '1:1', width: 1024, height: 1024 },
  { value: '16:9', label: '16:9', width: 1280, height: 720 },
  { value: '9:16', label: '9:16', width: 720, height: 1280 },
  { value: '4:3', label: '4:3', width: 1024, height: 768 },
  { value: '3:4', label: '3:4', width: 768, height: 1024 },
]

const stylePresets = [
  { id: 'realistic', name: 'リアル', description: '写真のようなリアルな画像' },
  { id: 'anime', name: 'アニメ', description: '日本のアニメスタイル' },
  { id: 'illustration', name: 'イラスト', description: 'デジタルイラスト風' },
  { id: 'oil-painting', name: '油絵', description: 'クラシックな油絵風' },
  { id: 'watercolor', name: '水彩', description: '柔らかい水彩画風' },
  { id: '3d-render', name: '3D', description: '3DCG風のレンダリング' },
]

export default function ImageGeneratePage() {
  const [prompt, setPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1')
  const [selectedStyle, setSelectedStyle] = useState('realistic')
  const [quality, setQuality] = useState([80])
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<string[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('プロンプトを入力してください')
      return
    }

    setIsGenerating(true)
    toast.info('画像生成機能は現在準備中です')

    // Simulate generation
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setIsGenerating(false)
    toast.info('この機能は近日公開予定です')
  }

  return (
    <div className="flex h-screen bg-zinc-950">
      <GenerateSidebar />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Input */}
        <div className="flex flex-col w-[480px] border-r border-zinc-800 bg-zinc-900">
          {/* Header */}
          <div className="flex items-center gap-4 px-6 py-4 border-b border-zinc-800">
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-emerald-400" />
              画像生成
            </h1>
            <span className="px-2 py-0.5 text-[10px] bg-yellow-500 text-black rounded font-bold">
              Coming Soon
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Prompt */}
            <div>
              <label className="block text-sm text-zinc-400 mb-2">
                プロンプト
              </label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="生成したい画像を説明してください..."
                className="h-32 bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 resize-none"
              />
              <div className="flex justify-between mt-2">
                <span className="text-xs text-zinc-500">{prompt.length} / 2000</span>
              </div>
            </div>

            {/* Style Presets */}
            <div>
              <label className="block text-sm text-zinc-400 mb-3">スタイル</label>
              <div className="grid grid-cols-3 gap-2">
                {stylePresets.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id)}
                    className={cn(
                      'p-3 rounded-lg border text-left transition-all',
                      selectedStyle === style.id
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                        : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600'
                    )}
                  >
                    <p className="text-sm font-medium">{style.name}</p>
                    <p className="text-xs text-zinc-500 mt-1">{style.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect Ratio */}
            <div>
              <label className="block text-sm text-zinc-400 mb-3">
                <Ratio className="inline h-4 w-4 mr-1" />
                アスペクト比
              </label>
              <div className="flex gap-2">
                {aspectRatios.map((ratio) => (
                  <button
                    key={ratio.value}
                    onClick={() => setAspectRatio(ratio.value)}
                    className={cn(
                      'flex-1 py-2 px-3 rounded-lg border text-sm transition-all',
                      aspectRatio === ratio.value
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                        : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600'
                    )}
                  >
                    {ratio.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Advanced Settings */}
            <div>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                <Settings2 className="h-4 w-4" />
                詳細設定
              </button>

              {showAdvanced && (
                <div className="mt-4 space-y-4 p-4 bg-zinc-800/50 rounded-lg">
                  {/* Negative Prompt */}
                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">
                      ネガティブプロンプト
                    </label>
                    <Textarea
                      value={negativePrompt}
                      onChange={(e) => setNegativePrompt(e.target.value)}
                      placeholder="除外したい要素..."
                      className="h-20 bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 resize-none text-sm"
                    />
                  </div>

                  {/* Quality */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-sm text-zinc-400">品質</label>
                      <span className="text-sm text-emerald-400">{quality[0]}%</span>
                    </div>
                    <Slider
                      value={quality}
                      onValueChange={setQuality}
                      min={50}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Generate Button */}
          <div className="p-4 border-t border-zinc-800">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-all disabled:opacity-50"
            >
              {isGenerating ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  生成中...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Wand2 className="h-4 w-4" />
                  画像を生成
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Right Panel - Preview */}
        <div className="flex-1 flex flex-col bg-zinc-950 p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">プレビュー</h2>
            {generatedImages.length > 0 && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="border-zinc-700">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  再生成
                </Button>
                <Button variant="outline" size="sm" className="border-zinc-700">
                  <Download className="h-4 w-4 mr-2" />
                  ダウンロード
                </Button>
              </div>
            )}
          </div>

          {/* Preview Area */}
          <div className="flex-1 flex items-center justify-center">
            {isGenerating ? (
              <div className="text-center">
                <div className="relative w-64 h-64 mx-auto">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-2xl animate-pulse opacity-20" />
                  <div className="absolute inset-4 bg-zinc-800 rounded-xl flex items-center justify-center">
                    <Loader2 className="h-12 w-12 text-emerald-400 animate-spin" />
                  </div>
                </div>
                <p className="text-zinc-400 mt-4">画像を生成中...</p>
              </div>
            ) : generatedImages.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {generatedImages.map((url, index) => (
                  <div
                    key={index}
                    className="relative aspect-square bg-zinc-800 rounded-xl overflow-hidden"
                  >
                    <img
                      src={url}
                      alt={`Generated ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center">
                <div className="w-32 h-32 mx-auto bg-zinc-800 rounded-2xl flex items-center justify-center mb-4">
                  <Sparkles className="h-12 w-12 text-zinc-700" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">
                  画像を生成しましょう
                </h3>
                <p className="text-zinc-500 text-sm max-w-md">
                  左側のパネルでプロンプトを入力し、
                  スタイルを選択して「生成」をクリックしてください
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
