'use client'

import { useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import {
  Upload,
  FileSpreadsheet,
  X,
  Check,
  Loader2,
  AlertCircle,
  User,
  Sparkles,
  ChevronDown,
  Download,
} from 'lucide-react'
import { useCreateBatch, useBatchStatus, parseCSV } from '@/hooks/useBatchGenerate'
import { useHeygenAvatars, useHeygenVoices, type HeyGenAvatar, type HeyGenVoice } from '@/hooks/useHeygenAssets'
import type { BatchJobType, BatchCSVRow, HeyGenBatchConfig, KlingBatchConfig } from '@/types/batch'

interface BatchGenerateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (batchId: string) => void
}

export function BatchGenerateModal({
  open,
  onOpenChange,
  onSuccess,
}: BatchGenerateModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<'upload' | 'config' | 'preview' | 'progress'>('upload')
  const [batchType, setBatchType] = useState<BatchJobType>('heygen')
  const [batchName, setBatchName] = useState('')
  const [csvRows, setCsvRows] = useState<BatchCSVRow[]>([])
  const [batchJobId, setBatchJobId] = useState<string | null>(null)

  // HeyGen設定
  const [selectedAvatar, setSelectedAvatar] = useState<HeyGenAvatar | null>(null)
  const [selectedVoice, setSelectedVoice] = useState<HeyGenVoice | null>(null)
  const [showAvatarDropdown, setShowAvatarDropdown] = useState(false)
  const [showVoiceDropdown, setShowVoiceDropdown] = useState(false)

  // Kling設定（将来対応）
  // const [klingConfig, setKlingConfig] = useState<KlingBatchConfig>({...})

  // Fetch assets
  const { data: avatars, isLoading: avatarsLoading } = useHeygenAvatars()
  const { data: voices } = useHeygenVoices()

  // Mutations
  const { mutate: createBatch, isPending: isCreating } = useCreateBatch()

  // Batch status polling
  const { data: batchStatus } = useBatchStatus(batchJobId, {
    enabled: step === 'progress' && !!batchJobId,
  })

  // CSVファイル読み込み
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const csvText = event.target?.result as string
        const { headers, rows } = parseCSV(csvText)

        // 必須フィールドチェック
        if (batchType === 'heygen' && !headers.includes('script')) {
          toast.error('HeyGenバッチにはscript列が必要です')
          return
        }
        if (batchType === 'kling' && !headers.includes('prompt') && !headers.includes('imageUrl')) {
          toast.error('Klingバッチにはprompt列またはimageUrl列が必要です')
          return
        }

        // CSVRowsに変換
        const batchRows: BatchCSVRow[] = rows.map((row) => ({
          title: row.title || row.タイトル,
          script: row.script || row.スクリプト,
          prompt: row.prompt || row.プロンプト,
          imageUrl: row.imageUrl || row.image_url,
          productId: row.productId || row.product_id,
        }))

        setCsvRows(batchRows)
        setStep('config')
        toast.success(`${batchRows.length}件のデータを読み込みました`)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'CSVの解析に失敗しました')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [batchType])

  // バッチ生成開始
  const handleStartBatch = useCallback(() => {
    if (batchType === 'heygen' && !selectedAvatar) {
      toast.error('アバターを選択してください')
      return
    }

    const config: HeyGenBatchConfig = {
      type: 'heygen',
      avatarId: selectedAvatar!.avatar_id,
      voiceId: selectedVoice?.voice_id,
    }

    createBatch(
      {
        type: batchType,
        name: batchName || undefined,
        config,
        items: csvRows,
      },
      {
        onSuccess: (data) => {
          setBatchJobId(data.batchJob.id)
          setStep('progress')
          toast.success('バッチ生成を開始しました')
          onSuccess?.(data.batchJob.id)
        },
        onError: (error) => {
          toast.error(error.message || 'バッチ生成の開始に失敗しました')
        },
      }
    )
  }, [batchType, selectedAvatar, selectedVoice, batchName, csvRows, createBatch, onSuccess])

  // リセット
  const handleReset = useCallback(() => {
    setStep('upload')
    setCsvRows([])
    setBatchJobId(null)
    setSelectedAvatar(null)
    setSelectedVoice(null)
    setBatchName('')
  }, [])

  // モーダルクローズ
  const handleClose = useCallback(() => {
    if (step === 'progress' && batchStatus?.status === 'processing') {
      // 処理中は閉じない（または確認ダイアログ）
      toast.info('バッチ処理はバックグラウンドで継続します')
    }
    handleReset()
    onOpenChange(false)
  }, [step, batchStatus, handleReset, onOpenChange])

  // サンプルCSVダウンロード
  const handleDownloadSample = useCallback(() => {
    const sampleCSV = batchType === 'heygen'
      ? 'title,script\n商品紹介1,この商品は素晴らしい機能を持っています。\n商品紹介2,特別な体験をお届けします。'
      : 'title,prompt,imageUrl\n動画1,美しい風景の映像を生成,\n動画2,,https://example.com/image.jpg'

    const blob = new Blob([sampleCSV], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `batch_sample_${batchType}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [batchType])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
            バッチ生成
            {step !== 'upload' && (
              <span className="text-sm font-normal text-zinc-400 ml-2">
                ({csvRows.length}件)
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="space-y-6 py-4">
            {/* Type Selection */}
            <div>
              <label className="block text-sm text-zinc-400 mb-2">生成タイプ</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setBatchType('heygen')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all',
                    batchType === 'heygen'
                      ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                      : 'border-zinc-700 text-zinc-400 hover:border-zinc-600'
                  )}
                >
                  <User className="h-5 w-5" />
                  HeyGen
                </button>
                <button
                  onClick={() => setBatchType('kling')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all',
                    batchType === 'kling'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                      : 'border-zinc-700 text-zinc-400 hover:border-zinc-600'
                  )}
                >
                  <Sparkles className="h-5 w-5" />
                  Kling AI
                </button>
              </div>
            </div>

            {/* CSV Upload Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-700 rounded-xl p-8 text-center cursor-pointer hover:border-zinc-500 hover:bg-zinc-800/30 transition-all"
            >
              <Upload className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-white font-medium mb-2">CSVファイルをドラッグ&ドロップ</p>
              <p className="text-zinc-500 text-sm mb-4">またはクリックして選択</p>
              <Button variant="outline" size="sm" className="border-zinc-700">
                ファイルを選択
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* Sample Download */}
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-800/50 rounded-lg">
              <div>
                <p className="text-sm text-white">サンプルCSV</p>
                <p className="text-xs text-zinc-500">
                  {batchType === 'heygen' ? 'title, script' : 'title, prompt, imageUrl'}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-zinc-700"
                onClick={handleDownloadSample}
              >
                <Download className="h-4 w-4 mr-1" />
                ダウンロード
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Config */}
        {step === 'config' && batchType === 'heygen' && (
          <div className="space-y-6 py-4">
            {/* Batch Name */}
            <div>
              <label className="block text-sm text-zinc-400 mb-2">バッチ名（任意）</label>
              <input
                type="text"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                placeholder="例: 商品紹介バッチ"
                className="w-full px-4 py-3 bg-zinc-800 text-white placeholder-zinc-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>

            {/* Avatar Selection */}
            <div>
              <label className="block text-sm text-zinc-400 mb-2">共通アバター（必須）</label>
              <div className="relative">
                <button
                  onClick={() => setShowAvatarDropdown(!showAvatarDropdown)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {selectedAvatar ? (
                      <>
                        <img
                          src={selectedAvatar.preview_image_url}
                          alt={selectedAvatar.avatar_name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <span className="text-white">{selectedAvatar.avatar_name}</span>
                      </>
                    ) : (
                      <>
                        <User className="h-5 w-5 text-zinc-500" />
                        <span className="text-zinc-500">アバターを選択...</span>
                      </>
                    )}
                  </div>
                  <ChevronDown className="h-4 w-4 text-zinc-500" />
                </button>

                {showAvatarDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 rounded-lg shadow-xl border border-zinc-700 overflow-hidden z-20 max-h-[200px] overflow-y-auto">
                    {avatarsLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 text-purple-400 animate-spin" />
                      </div>
                    ) : (
                      avatars?.slice(0, 20).map((avatar) => (
                        <button
                          key={avatar.avatar_id}
                          onClick={() => {
                            setSelectedAvatar(avatar)
                            setShowAvatarDropdown(false)
                          }}
                          className={cn(
                            'w-full flex items-center gap-3 px-4 py-2 hover:bg-zinc-700 transition-colors',
                            selectedAvatar?.avatar_id === avatar.avatar_id
                              ? 'text-purple-400 bg-purple-500/10'
                              : 'text-zinc-300'
                          )}
                        >
                          <img
                            src={avatar.preview_image_url}
                            alt={avatar.avatar_name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          <span>{avatar.avatar_name}</span>
                          {selectedAvatar?.avatar_id === avatar.avatar_id && (
                            <Check className="h-4 w-4 ml-auto" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Voice Selection */}
            <div>
              <label className="block text-sm text-zinc-400 mb-2">共通ボイス（任意）</label>
              <div className="relative">
                <button
                  onClick={() => setShowVoiceDropdown(!showVoiceDropdown)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
                >
                  <span className={selectedVoice ? 'text-white' : 'text-zinc-500'}>
                    {selectedVoice ? `${selectedVoice.name} (${selectedVoice.language})` : 'ボイスを選択...'}
                  </span>
                  <ChevronDown className="h-4 w-4 text-zinc-500" />
                </button>

                {showVoiceDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 rounded-lg shadow-xl border border-zinc-700 overflow-hidden z-20 max-h-[200px] overflow-y-auto">
                    <button
                      onClick={() => {
                        setSelectedVoice(null)
                        setShowVoiceDropdown(false)
                      }}
                      className="w-full px-4 py-2 text-left text-zinc-400 hover:bg-zinc-700"
                    >
                      なし
                    </button>
                    {voices?.filter(v => v.language.includes('Japanese')).slice(0, 10).map((voice) => (
                      <button
                        key={voice.voice_id}
                        onClick={() => {
                          setSelectedVoice(voice)
                          setShowVoiceDropdown(false)
                        }}
                        className={cn(
                          'w-full flex items-center justify-between px-4 py-2 hover:bg-zinc-700 transition-colors',
                          selectedVoice?.voice_id === voice.voice_id
                            ? 'text-purple-400 bg-purple-500/10'
                            : 'text-zinc-300'
                        )}
                      >
                        <span>{voice.name} ({voice.language})</span>
                        {selectedVoice?.voice_id === voice.voice_id && (
                          <Check className="h-4 w-4" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Preview Button */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="border-zinc-700"
                onClick={() => setStep('upload')}
              >
                戻る
              </Button>
              <Button
                className="flex-1 bg-purple-500 hover:bg-purple-600"
                onClick={() => setStep('preview')}
                disabled={!selectedAvatar}
              >
                プレビュー
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 'preview' && (
          <div className="space-y-4 py-4">
            {/* Summary */}
            <div className="px-4 py-3 bg-zinc-800 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">アバター</span>
                <span className="text-white">{selectedAvatar?.avatar_name}</span>
              </div>
              {selectedVoice && (
                <div className="flex items-center justify-between mt-2">
                  <span className="text-zinc-400">ボイス</span>
                  <span className="text-white">{selectedVoice.name}</span>
                </div>
              )}
              <div className="flex items-center justify-between mt-2">
                <span className="text-zinc-400">生成数</span>
                <span className="text-white">{csvRows.length}本</span>
              </div>
            </div>

            {/* Items Preview */}
            <div className="max-h-[200px] overflow-y-auto space-y-2">
              {csvRows.slice(0, 10).map((row, index) => (
                <div key={index} className="px-4 py-3 bg-zinc-800/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white font-medium">
                      {row.title || `動画 ${index + 1}`}
                    </span>
                    <span className="text-xs text-zinc-500">#{index + 1}</span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                    {row.script || row.prompt}
                  </p>
                </div>
              ))}
              {csvRows.length > 10 && (
                <p className="text-center text-sm text-zinc-500">
                  他 {csvRows.length - 10} 件...
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="border-zinc-700"
                onClick={() => setStep('config')}
              >
                戻る
              </Button>
              <Button
                className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                onClick={handleStartBatch}
                disabled={isCreating}
              >
                {isCreating ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    開始中...
                  </span>
                ) : (
                  `${csvRows.length}本の生成を開始`
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Progress */}
        {step === 'progress' && batchStatus && (
          <div className="space-y-6 py-4">
            {/* Progress Overview */}
            <div className="text-center">
              {batchStatus.status === 'processing' ? (
                <Loader2 className="h-12 w-12 text-emerald-400 mx-auto mb-4 animate-spin" />
              ) : batchStatus.status === 'completed' ? (
                <Check className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
              ) : (
                <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              )}
              <h3 className="text-lg font-medium text-white">
                {batchStatus.status === 'processing' && '生成中...'}
                {batchStatus.status === 'completed' && '完了'}
                {batchStatus.status === 'failed' && '失敗'}
              </h3>
            </div>

            {/* Progress Bar */}
            <div>
              <div className="flex items-center justify-between text-sm text-zinc-400 mb-2">
                <span>
                  {batchStatus.completedCount + batchStatus.failedCount} / {batchStatus.totalCount}
                </span>
                <span>{batchStatus.progress}%</span>
              </div>
              <Progress value={batchStatus.progress} className="h-2" />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center px-4 py-3 bg-zinc-800 rounded-lg">
                <p className="text-2xl font-bold text-emerald-400">{batchStatus.completedCount}</p>
                <p className="text-xs text-zinc-500">成功</p>
              </div>
              <div className="text-center px-4 py-3 bg-zinc-800 rounded-lg">
                <p className="text-2xl font-bold text-red-400">{batchStatus.failedCount}</p>
                <p className="text-xs text-zinc-500">失敗</p>
              </div>
              <div className="text-center px-4 py-3 bg-zinc-800 rounded-lg">
                <p className="text-2xl font-bold text-zinc-400">
                  {batchStatus.totalCount - batchStatus.completedCount - batchStatus.failedCount}
                </p>
                <p className="text-xs text-zinc-500">待機中</p>
              </div>
            </div>

            {/* Close Button */}
            <Button
              className="w-full"
              variant={batchStatus.status === 'completed' ? 'default' : 'outline'}
              onClick={handleClose}
            >
              {batchStatus.status === 'processing' ? 'バックグラウンドで継続' : '閉じる'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
