'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  Wand2,
  Layers,
  Globe,
  TestTube,
  Check,
} from 'lucide-react'

interface VariantGenerateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  videoId: string
  videoTitle: string
  onSuccess?: (variantIds: string[]) => void
}

type Preset = 'tiktok_ab' | 'multi_platform' | 'full_test'

const PRESETS = [
  {
    id: 'tiktok_ab' as Preset,
    name: 'TikTok A/Bテスト',
    icon: TestTube,
    description: '4パターン生成（オリジナル / UGCライト / UGCヘビー / ヴィンテージ）',
    variants: ['オリジナル', 'UGC風ライト', 'UGC風ヘビー', 'ヴィンテージ'],
  },
  {
    id: 'multi_platform' as Preset,
    name: 'マルチプラットフォーム',
    icon: Globe,
    description: '4プラットフォーム向けに最適化',
    variants: ['TikTok', 'Instagram Reels', 'YouTube Shorts', 'Twitter/X'],
  },
  {
    id: 'full_test' as Preset,
    name: 'フルテスト',
    icon: Layers,
    description: 'UGC × 字幕の組み合わせ（3-5パターン）',
    variants: ['オリジナル', 'UGCライト', 'UGCミディアム', '字幕付き', 'UGC+字幕'],
  },
]

export function VariantGenerateModal({
  open,
  onOpenChange,
  videoId,
  videoTitle,
  onSuccess,
}: VariantGenerateModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<Preset>('tiktok_ab')
  const [subtitleTexts, setSubtitleTexts] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      const body: {
        videoId: string
        preset: Preset
        subtitleTexts?: string[]
      } = {
        videoId,
        preset: selectedPreset,
      }

      // full_testの場合は字幕テキストを追加
      if (selectedPreset === 'full_test' && subtitleTexts.trim()) {
        body.subtitleTexts = subtitleTexts
          .split('\n')
          .map(s => s.trim())
          .filter(s => s.length > 0)
      }

      const response = await fetch('/api/videos/variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'バリアント生成に失敗しました')
      }

      const result = await response.json()
      onSuccess?.(result.variantIds)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setIsGenerating(false)
    }
  }

  const selectedPresetInfo = PRESETS.find(p => p.id === selectedPreset)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-pink-500" />
            バリアント生成
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            「{videoTitle}」から複数のバリアントを一括生成します
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Preset Selection */}
          <div className="space-y-3">
            <Label className="text-white">プリセット選択</Label>
            <div className="grid gap-3">
              {PRESETS.map((preset) => {
                const Icon = preset.icon
                const isSelected = selectedPreset === preset.id
                return (
                  <button
                    key={preset.id}
                    onClick={() => setSelectedPreset(preset.id)}
                    className={`p-4 rounded-lg border text-left transition-all hover:scale-[1.01] active:scale-[0.99] ${
                      isSelected
                        ? 'border-pink-500 bg-pink-500/10'
                        : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`h-5 w-5 mt-0.5 ${isSelected ? 'text-pink-500' : 'text-zinc-400'}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                            {preset.name}
                          </span>
                          {isSelected && <Check className="h-4 w-4 text-pink-500" />}
                        </div>
                        <p className="text-sm text-zinc-500 mt-1">{preset.description}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {preset.variants.map((v, i) => (
                            <Badge
                              key={i}
                              variant="secondary"
                              className="text-xs bg-zinc-700/50 text-zinc-400"
                            >
                              {v}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Subtitle Input for full_test */}
          {selectedPreset === 'full_test' && (
            <div className="space-y-2">
              <Label className="text-white">字幕テキスト（1行1フレーズ）</Label>
              <Textarea
                value={subtitleTexts}
                onChange={(e) => setSubtitleTexts(e.target.value)}
                placeholder={`おすすめポイント！\n使いやすい！\n今すぐチェック！`}
                className="bg-zinc-800 border-zinc-700 min-h-[100px]"
              />
              <p className="text-xs text-zinc-500">
                入力すると字幕付きバリアントも生成されます（省略可）
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-500/10 rounded-md">
              {error}
            </div>
          )}

          {/* Summary */}
          <div className="p-3 bg-zinc-800/50 rounded-lg">
            <p className="text-sm text-zinc-400">
              <span className="text-white font-medium">
                {selectedPresetInfo?.variants.length || 0}個
              </span>
              のバリアントが生成されます
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-zinc-700"
            disabled={isGenerating}
          >
            キャンセル
          </Button>
          <Button
            onClick={handleGenerate}
            className="bg-pink-500 hover:bg-pink-600"
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                バリアント生成
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
