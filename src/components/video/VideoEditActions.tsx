'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Loader2,
  Wand2,
  Palette,
  Scissors,
  Image,
  Eraser,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  PartyPopper,
} from 'lucide-react'
import { toast } from 'sonner'
import { useVideoStatus } from '@/hooks/useVideoStatus'
import { STYLE_PRESETS, BACKGROUND_PRESETS } from '@/lib/video/kling/styles'

type EditMode = 'style' | 'background' | 'edit' | 'inpaint' | null

interface VideoEditActionsProps {
  videoId: string
  videoTitle: string
  productId: string
  originTaskId?: string
  durationSeconds?: number
}

export function VideoEditActions({
  videoId,
  videoTitle,
  productId,
  originTaskId,
  durationSeconds,
}: VideoEditActionsProps) {
  const [editMode, setEditMode] = useState<EditMode>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [generatingVideoId, setGeneratingVideoId] = useState<string | null>(null)

  // Style Transfer
  const [stylePresetId, setStylePresetId] = useState<string>('')
  const [styleImageUrl, setStyleImageUrl] = useState('')
  const [styleStrength, setStyleStrength] = useState(0.7)

  // V2V Edit
  const [editPrompt, setEditPrompt] = useState('')
  const [editStrength, setEditStrength] = useState(0.5)

  // Background
  const [backgroundPresetId, setBackgroundPresetId] = useState<string>('')
  const [backgroundPrompt, setBackgroundPrompt] = useState('')
  const [backgroundImageUrl, setBackgroundImageUrl] = useState('')

  // Inpaint
  const [removePrompt, setRemovePrompt] = useState('')

  // Common
  const [title, setTitle] = useState('')

  const { data: videoStatus } = useVideoStatus(generatingVideoId, {
    enabled: !!generatingVideoId,
    pollInterval: 2000,
  })

  const openModal = (mode: EditMode) => {
    setEditMode(mode)
    setIsOpen(true)
  }

  const closeModal = () => {
    setIsOpen(false)
    setEditMode(null)
    setIsSubmitting(false)
    setGeneratingVideoId(null)
    resetForm()
  }

  const resetForm = () => {
    setStylePresetId('')
    setStyleImageUrl('')
    setStyleStrength(0.7)
    setEditPrompt('')
    setEditStrength(0.5)
    setBackgroundPresetId('')
    setBackgroundPrompt('')
    setBackgroundImageUrl('')
    setRemovePrompt('')
    setTitle('')
  }

  const handleSubmit = async () => {
    if (!originTaskId) {
      toast.error('この動画は編集できません（originTaskId が不明）')
      return
    }

    setIsSubmitting(true)

    try {
      let endpoint = ''
      let body: Record<string, unknown> = {
        sourceVideoId: videoId,
        originTaskId,
        productId,
      }

      const modeLabels: Record<string, string> = {
        style: 'スタイル変換',
        background: '背景変更',
        edit: '動画編集',
        inpaint: 'オブジェクト削除',
      }

      body.title = title || `${videoTitle} - ${modeLabels[editMode || 'edit']}`

      switch (editMode) {
        case 'style':
          endpoint = '/api/videos/kling/style'
          body = {
            ...body,
            stylePresetId: stylePresetId || undefined,
            styleImageUrl: styleImageUrl || undefined,
            customPrompt: undefined,
            strength: styleStrength,
          }
          break

        case 'background':
          endpoint = '/api/videos/kling/background'
          if (!backgroundPresetId && !backgroundPrompt && !backgroundImageUrl) {
            toast.error('背景の指定が必要です')
            setIsSubmitting(false)
            return
          }
          body = {
            ...body,
            backgroundPresetId: backgroundPresetId || undefined,
            backgroundPrompt: backgroundPrompt || undefined,
            backgroundImageUrl: backgroundImageUrl || undefined,
          }
          break

        case 'edit':
          endpoint = '/api/videos/kling/edit'
          if (!editPrompt) {
            toast.error('編集指示を入力してください')
            setIsSubmitting(false)
            return
          }
          body = {
            ...body,
            editPrompt,
            strength: editStrength,
          }
          break

        case 'inpaint':
          endpoint = '/api/videos/kling/inpaint'
          if (!removePrompt) {
            toast.error('削除対象を指定してください')
            setIsSubmitting(false)
            return
          }
          body = {
            ...body,
            removePrompt,
          }
          break

        default:
          return
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '処理に失敗しました')
      }

      if (result?.video?.id) {
        setGeneratingVideoId(result.video.id)
        toast.success('処理を開始しました')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '処理に失敗しました')
      setIsSubmitting(false)
    }
  }

  const getModalTitle = () => {
    switch (editMode) {
      case 'style':
        return 'スタイル変換'
      case 'background':
        return '背景変更'
      case 'edit':
        return '動画編集（自然言語）'
      case 'inpaint':
        return 'オブジェクト削除'
      default:
        return '編集'
    }
  }

  const isCompleted = videoStatus?.status === 'ready'
  const isFailed = videoStatus?.status === 'failed'
  const isGenerating = generatingVideoId && !isCompleted && !isFailed

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="border-zinc-700">
            <Wand2 className="mr-2 h-4 w-4" />
            AI編集
            <MoreHorizontal className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 w-56">
          <DropdownMenuItem
            onClick={() => openModal('style')}
            className="cursor-pointer hover:bg-zinc-800"
          >
            <Palette className="mr-2 h-4 w-4 text-purple-400" />
            <span>スタイル変換</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => openModal('background')}
            className="cursor-pointer hover:bg-zinc-800"
          >
            <Image className="mr-2 h-4 w-4 text-blue-400" />
            <span>背景変更</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-zinc-800" />
          <DropdownMenuItem
            onClick={() => openModal('edit')}
            className="cursor-pointer hover:bg-zinc-800"
          >
            <Scissors className="mr-2 h-4 w-4 text-green-400" />
            <span>自然言語編集</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => openModal('inpaint')}
            className="cursor-pointer hover:bg-zinc-800"
          >
            <Eraser className="mr-2 h-4 w-4 text-orange-400" />
            <span>オブジェクト削除</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isOpen} onOpenChange={(o) => { if (!o) closeModal() }}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-purple-500" />
              {getModalTitle()}
            </DialogTitle>
          </DialogHeader>

          {/* 生成中/完了表示 */}
          {generatingVideoId ? (
            <div className="py-8 text-center space-y-4">
              {isCompleted ? (
                <>
                  <div className="flex justify-center">
                    <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center">
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-white">完成しました！</p>
                    <p className="text-zinc-400 mt-1">動画一覧で確認できます</p>
                  </div>
                  <div className="flex justify-center gap-3">
                    <Button variant="outline" onClick={closeModal}>
                      閉じる
                    </Button>
                    <Button
                      className="bg-gradient-to-r from-purple-500 to-pink-500"
                      onClick={() => window.location.href = '/videos'}
                    >
                      動画一覧を見る
                    </Button>
                  </div>
                </>
              ) : isFailed ? (
                <>
                  <div className="flex justify-center">
                    <div className="h-16 w-16 rounded-full bg-red-500/20 flex items-center justify-center">
                      <XCircle className="h-8 w-8 text-red-500" />
                    </div>
                  </div>
                  <p className="text-xl font-bold text-white">処理に失敗しました</p>
                  <Button variant="outline" onClick={closeModal}>
                    閉じる
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex justify-center">
                    <div className="h-16 w-16 rounded-full bg-purple-500/20 flex items-center justify-center animate-pulse">
                      <Wand2 className="h-8 w-8 text-purple-500" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-white">処理中...</p>
                    <p className="text-zinc-400 mt-1">
                      {videoStatus?.message || '処理を実行しています'}
                    </p>
                  </div>
                  <Progress value={videoStatus?.progress || 0} className="max-w-xs mx-auto" />
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* タイトル */}
              <div>
                <Label>新しい動画のタイトル（任意）</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={`${videoTitle} - ${getModalTitle()}`}
                  className="bg-zinc-800 border-zinc-700 mt-1"
                />
              </div>

              {/* Style Transfer */}
              {editMode === 'style' && (
                <>
                  <div>
                    <Label>スタイルプリセット</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2 max-h-[200px] overflow-y-auto">
                      {STYLE_PRESETS.filter(p => p.id !== 'custom').map((preset) => (
                        <Card
                          key={preset.id}
                          className={`cursor-pointer transition-all ${
                            stylePresetId === preset.id
                              ? 'bg-purple-500/20 border-purple-500'
                              : 'bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800'
                          }`}
                          onClick={() => setStylePresetId(preset.id)}
                        >
                          <CardContent className="p-3">
                            <p className="font-medium text-white text-sm">{preset.nameJa}</p>
                            <p className="text-xs text-zinc-400 mt-1 line-clamp-1">{preset.descriptionJa}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">参照スタイル画像URL（任意）</Label>
                    <Input
                      value={styleImageUrl}
                      onChange={(e) => setStyleImageUrl(e.target.value)}
                      placeholder="https://..."
                      className="bg-zinc-800 border-zinc-700 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">適用強度: {styleStrength.toFixed(1)}</Label>
                    <input
                      type="range"
                      value={styleStrength}
                      onChange={(e) => setStyleStrength(parseFloat(e.target.value))}
                      min={0}
                      max={1}
                      step={0.1}
                      className="w-full mt-2 h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-pink-500
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                        [&::-webkit-slider-thumb]:bg-pink-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
                        [&::-webkit-slider-thumb]:hover:bg-pink-400 [&::-webkit-slider-thumb]:transition-colors
                        [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-pink-500
                        [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                    />
                  </div>
                </>
              )}

              {/* Background Replace */}
              {editMode === 'background' && (
                <>
                  <div>
                    <Label>背景プリセット</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2 max-h-[200px] overflow-y-auto">
                      {BACKGROUND_PRESETS.filter(p => p.id !== 'custom').map((preset) => (
                        <Card
                          key={preset.id}
                          className={`cursor-pointer transition-all ${
                            backgroundPresetId === preset.id
                              ? 'bg-blue-500/20 border-blue-500'
                              : 'bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800'
                          }`}
                          onClick={() => setBackgroundPresetId(preset.id)}
                        >
                          <CardContent className="p-3">
                            <p className="font-medium text-white text-sm">{preset.nameJa}</p>
                            <p className="text-xs text-zinc-400 mt-1 line-clamp-1">{preset.descriptionJa}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">または背景の説明（任意）</Label>
                    <Textarea
                      value={backgroundPrompt}
                      onChange={(e) => setBackgroundPrompt(e.target.value)}
                      placeholder="夕焼けのビーチ、都会の夜景など..."
                      className="bg-zinc-800 border-zinc-700 mt-1 min-h-[60px]"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">または背景画像URL（任意）</Label>
                    <Input
                      value={backgroundImageUrl}
                      onChange={(e) => setBackgroundImageUrl(e.target.value)}
                      placeholder="https://..."
                      className="bg-zinc-800 border-zinc-700 mt-1"
                    />
                  </div>
                </>
              )}

              {/* V2V Edit */}
              {editMode === 'edit' && (
                <>
                  <div>
                    <Label>編集指示（自然言語）</Label>
                    <Textarea
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                      placeholder="例: 背景を夕焼けに変更、照明を暖かくする..."
                      className="bg-zinc-800 border-zinc-700 mt-1 min-h-[80px]"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">編集強度: {editStrength.toFixed(1)}</Label>
                    <input
                      type="range"
                      value={editStrength}
                      onChange={(e) => setEditStrength(parseFloat(e.target.value))}
                      min={0}
                      max={1}
                      step={0.1}
                      className="w-full mt-2"
                    />
                    <p className="text-xs text-zinc-500 mt-1">
                      低い値: 元動画に近い / 高い値: 大きく変化
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-800/50">
                    <p className="text-xs text-zinc-400">使用例:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {['背景を夕焼けに', '照明を暖かく', 'スローモーション', '色を鮮やかに'].map((ex) => (
                        <Button
                          key={ex}
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-zinc-300 hover:text-white"
                          onClick={() => setEditPrompt(ex)}
                        >
                          {ex}
                        </Button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Inpaint */}
              {editMode === 'inpaint' && (
                <>
                  <div>
                    <Label>削除したいもの（自然言語）</Label>
                    <Textarea
                      value={removePrompt}
                      onChange={(e) => setRemovePrompt(e.target.value)}
                      placeholder="例: 背景の人物、ロゴ、影..."
                      className="bg-zinc-800 border-zinc-700 mt-1 min-h-[80px]"
                    />
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-800/50">
                    <p className="text-xs text-zinc-400">使用例:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {['背景の人物を削除', 'ロゴを消す', '影を削除', 'テキストを削除'].map((ex) => (
                        <Button
                          key={ex}
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-zinc-300 hover:text-white"
                          onClick={() => setRemovePrompt(ex)}
                        >
                          {ex}
                        </Button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                <Button variant="ghost" onClick={closeModal}>
                  キャンセル
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-purple-500 to-pink-500"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      処理中...
                    </>
                  ) : (
                    '処理開始'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
