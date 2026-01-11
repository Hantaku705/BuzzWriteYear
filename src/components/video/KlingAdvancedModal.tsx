'use client'

import { useState, useMemo, useEffect } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Loader2,
  ArrowLeft,
  Wand2,
  Camera,
  Move,
  Palette,
  X,
  CheckCircle,
  XCircle,
  Layers,
  PartyPopper,
} from 'lucide-react'
import { toast } from 'sonner'
import { useProducts } from '@/hooks/useProducts'
import { useVideoStatus } from '@/hooks/useVideoStatus'
import { MOTION_PRESETS, CAMERA_PRESETS } from '@/lib/video/kling/motion-presets'
import {
  KLING_MODEL_INFO,
  calculatePrice,
  formatPrice,
  isProOnlyModel,
  type KlingModelVersion,
  type KlingAspectRatio,
  type KlingQuality,
} from '@/lib/video/kling/constants'

type AdvancedMode = 'motion' | 'camera' | 'elements'
type Step = 'mode' | 'product' | 'params' | 'generating'

interface KlingAdvancedModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function KlingAdvancedModal({ open, onOpenChange }: KlingAdvancedModalProps) {
  // Mode & Step
  const [advancedMode, setAdvancedMode] = useState<AdvancedMode | null>(null)
  const [step, setStep] = useState<Step>('mode')

  // Common State
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [title, setTitle] = useState('')
  const [prompt, setPrompt] = useState('')

  // Generation params
  const [modelVersion, setModelVersion] = useState<KlingModelVersion>('2.6')
  const [aspectRatio, setAspectRatio] = useState<KlingAspectRatio>('9:16')
  const [quality, setQuality] = useState<KlingQuality>('standard')
  const [duration, setDuration] = useState<5 | 10>(5)

  // Motion Reference State
  const [motionPresetId, setMotionPresetId] = useState<string>('')
  const [motionVideoUrl, setMotionVideoUrl] = useState('')
  const [motionStrength, setMotionStrength] = useState(0.7)

  // Camera Control State
  const [cameraPresetId, setCameraPresetId] = useState<string>('')
  const [cameraVideoUrl, setCameraVideoUrl] = useState('')

  // Elements State
  const [elementImages, setElementImages] = useState<string[]>([''])

  // Generation State
  const [generatingVideoId, setGeneratingVideoId] = useState<string | null>(null)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: products = [] } = useProducts()
  const { data: videoStatus } = useVideoStatus(generatingVideoId, {
    enabled: !!generatingVideoId && step === 'generating',
    pollInterval: 2000,
  })

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId),
    [products, selectedProductId]
  )

  // 経過時間の更新
  useEffect(() => {
    if (step !== 'generating' || !startTime) return
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [step, startTime])

  // 生成完了/失敗時の処理
  useEffect(() => {
    if (!videoStatus) return
    if (videoStatus.status === 'ready') {
      toast.success('動画が完成しました！', {
        icon: <PartyPopper className="h-5 w-5 text-pink-500" />,
      })
    } else if (videoStatus.status === 'failed') {
      toast.error('動画生成に失敗しました')
      setTimeout(() => {
        resetForm()
        onOpenChange(false)
      }, 3000)
    }
  }, [videoStatus?.status, onOpenChange])

  const estimatedPrice = useMemo(() => {
    return calculatePrice(modelVersion, quality, duration)
  }, [modelVersion, quality, duration])

  const handleModelChange = (newModel: KlingModelVersion) => {
    setModelVersion(newModel)
    if (isProOnlyModel(newModel)) {
      setQuality('pro')
    }
  }

  const handleSubmit = async () => {
    if (!selectedProductId || !selectedProduct) return

    setIsSubmitting(true)

    try {
      let endpoint = ''
      let body: Record<string, unknown> = {
        productId: selectedProductId,
        title: title || `${selectedProduct.name} - ${advancedMode === 'motion' ? 'モーション' : advancedMode === 'camera' ? 'カメラ' : 'Elements'}`,
        imageUrl: selectedProduct.images[0],
        prompt: prompt || `High quality video of ${selectedProduct.name}`,
        duration: String(duration),
        aspectRatio,
        quality,
        modelVersion,
      }

      switch (advancedMode) {
        case 'motion':
          endpoint = '/api/videos/kling/motion'
          body = {
            ...body,
            motionPresetId: motionPresetId || undefined,
            motionVideoUrl: motionVideoUrl || undefined,
            motionStrength,
          }
          break

        case 'camera':
          endpoint = '/api/videos/kling/camera'
          body = {
            ...body,
            cameraPresetId: cameraPresetId || undefined,
            cameraReferenceVideoUrl: cameraVideoUrl || undefined,
          }
          break

        case 'elements':
          endpoint = '/api/videos/kling/elements'
          const validImages = elementImages.filter(Boolean)
          if (validImages.length === 0) {
            toast.error('少なくとも1枚の画像URLが必要です')
            setIsSubmitting(false)
            return
          }
          body = {
            productId: selectedProductId,
            title: title || `${selectedProduct.name} - Elements`,
            prompt: prompt || `High quality video with multiple elements`,
            negativePrompt: '',
            duration: String(duration),
            aspectRatio,
            quality,
            elementImages: validImages,
          }
          break
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate video')
      }

      if (result?.video?.id) {
        setGeneratingVideoId(result.video.id)
        setStartTime(Date.now())
        setElapsedTime(0)
        setStep('generating')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '生成に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setAdvancedMode(null)
    setStep('mode')
    setSelectedProductId('')
    setTitle('')
    setPrompt('')
    setModelVersion('2.6')
    setAspectRatio('9:16')
    setQuality('standard')
    setDuration(5)
    setMotionPresetId('')
    setMotionVideoUrl('')
    setMotionStrength(0.7)
    setCameraPresetId('')
    setCameraVideoUrl('')
    setElementImages([''])
    setGeneratingVideoId(null)
    setStartTime(null)
    setElapsedTime(0)
    setIsSubmitting(false)
  }

  const formatElapsedTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}分${secs.toString().padStart(2, '0')}秒`
  }

  const canProceed = () => {
    if (step === 'mode') return !!advancedMode
    if (step === 'product') return !!selectedProductId
    if (step === 'params') {
      if (advancedMode === 'elements') {
        return elementImages.some(Boolean)
      }
      return true
    }
    return false
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o) }}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-purple-500" />
            高度な動画生成（O1機能）
          </DialogTitle>
        </DialogHeader>

        {/* Step: Mode Selection */}
        {step === 'mode' && (
          <div className="space-y-4">
            <p className="text-zinc-400 text-sm">生成モードを選択してください</p>
            <div className="grid grid-cols-3 gap-4">
              <Card
                className={`cursor-pointer transition-all hover:scale-[1.02] ${
                  advancedMode === 'motion'
                    ? 'bg-purple-500/20 border-purple-500'
                    : 'bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800'
                }`}
                onClick={() => setAdvancedMode('motion')}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500">
                      <Move className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-white">Motion Reference</p>
                      <p className="text-sm text-zinc-400 mt-1">
                        参照動画の動きを適用
                      </p>
                      <p className="text-xs text-purple-400 mt-2">12プリセット</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-all hover:scale-[1.02] ${
                  advancedMode === 'camera'
                    ? 'bg-blue-500/20 border-blue-500'
                    : 'bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800'
                }`}
                onClick={() => setAdvancedMode('camera')}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500">
                      <Camera className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-white">Camera Control</p>
                      <p className="text-sm text-zinc-400 mt-1">
                        カメラワークを制御
                      </p>
                      <p className="text-xs text-blue-400 mt-2">14プリセット</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-all hover:scale-[1.02] ${
                  advancedMode === 'elements'
                    ? 'bg-pink-500/20 border-pink-500'
                    : 'bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800'
                }`}
                onClick={() => setAdvancedMode('elements')}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-orange-500">
                      <Layers className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-white">Elements</p>
                      <p className="text-sm text-zinc-400 mt-1">
                        複数画像から合成
                      </p>
                      <p className="text-xs text-pink-400 mt-2">最大7枚</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Step: Product Selection */}
        {step === 'product' && (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => setStep('mode')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              戻る
            </Button>
            <p className="text-zinc-400 text-sm">商品を選択してください</p>
            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="商品を選択" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedProduct && (
              <div className="flex items-center gap-4 p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                {selectedProduct.images[0] && (
                  <img
                    src={selectedProduct.images[0]}
                    alt={selectedProduct.name}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                )}
                <div>
                  <p className="font-medium text-white">{selectedProduct.name}</p>
                  <p className="text-sm text-zinc-400">¥{selectedProduct.price.toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step: Parameters */}
        {step === 'params' && (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => setStep('product')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              戻る
            </Button>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <Label>動画タイトル（任意）</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={`${selectedProduct?.name} - ${advancedMode === 'motion' ? 'モーション' : advancedMode === 'camera' ? 'カメラ' : 'Elements'}`}
                  className="bg-zinc-800 border-zinc-700 mt-1"
                />
              </div>

              {/* Prompt */}
              <div>
                <Label>プロンプト</Label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="動画の内容を説明してください..."
                  className="bg-zinc-800 border-zinc-700 mt-1 min-h-[80px]"
                />
              </div>

              {/* Motion Preset */}
              {advancedMode === 'motion' && (
                <div>
                  <Label>モーションプリセット</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2 max-h-[200px] overflow-y-auto">
                    {MOTION_PRESETS.filter(p => p.id !== 'custom').map((preset) => (
                      <Card
                        key={preset.id}
                        className={`cursor-pointer transition-all ${
                          motionPresetId === preset.id
                            ? 'bg-purple-500/20 border-purple-500'
                            : 'bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800'
                        }`}
                        onClick={() => setMotionPresetId(preset.id)}
                      >
                        <CardContent className="p-3">
                          <p className="font-medium text-white text-sm">{preset.nameJa}</p>
                          <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{preset.descriptionJa}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <div className="mt-3">
                    <Label className="text-xs">カスタム参照動画URL（任意）</Label>
                    <Input
                      value={motionVideoUrl}
                      onChange={(e) => setMotionVideoUrl(e.target.value)}
                      placeholder="https://..."
                      className="bg-zinc-800 border-zinc-700 mt-1"
                    />
                  </div>
                  <div className="mt-3">
                    <Label className="text-xs">モーション強度: {motionStrength.toFixed(1)}</Label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={motionStrength}
                      onChange={(e) => setMotionStrength(parseFloat(e.target.value))}
                      className="w-full mt-1"
                    />
                  </div>
                </div>
              )}

              {/* Camera Preset */}
              {advancedMode === 'camera' && (
                <div>
                  <Label>カメラプリセット</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2 max-h-[200px] overflow-y-auto">
                    {CAMERA_PRESETS.filter(p => p.id !== 'custom').map((preset) => (
                      <Card
                        key={preset.id}
                        className={`cursor-pointer transition-all ${
                          cameraPresetId === preset.id
                            ? 'bg-blue-500/20 border-blue-500'
                            : 'bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800'
                        }`}
                        onClick={() => setCameraPresetId(preset.id)}
                      >
                        <CardContent className="p-3">
                          <p className="font-medium text-white text-sm">{preset.nameJa}</p>
                          <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{preset.descriptionJa}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <div className="mt-3">
                    <Label className="text-xs">カスタム参照動画URL（任意）</Label>
                    <Input
                      value={cameraVideoUrl}
                      onChange={(e) => setCameraVideoUrl(e.target.value)}
                      placeholder="https://..."
                      className="bg-zinc-800 border-zinc-700 mt-1"
                    />
                  </div>
                </div>
              )}

              {/* Elements Images */}
              {advancedMode === 'elements' && (
                <div>
                  <Label>素材画像URL（最大7枚）</Label>
                  <div className="space-y-2 mt-2">
                    {elementImages.map((url, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={url}
                          onChange={(e) => {
                            const newImages = [...elementImages]
                            newImages[index] = e.target.value
                            setElementImages(newImages)
                          }}
                          placeholder={`画像URL ${index + 1}`}
                          className="bg-zinc-800 border-zinc-700"
                        />
                        {elementImages.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setElementImages(elementImages.filter((_, i) => i !== index))
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {elementImages.length < 7 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-zinc-700"
                        onClick={() => setElementImages([...elementImages, ''])}
                      >
                        + 画像を追加
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Common Generation Params */}
              {advancedMode !== 'elements' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>アスペクト比</Label>
                      <Select value={aspectRatio} onValueChange={(v) => setAspectRatio(v as KlingAspectRatio)}>
                        <SelectTrigger className="bg-zinc-800 border-zinc-700 mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-800 border-zinc-700">
                          <SelectItem value="9:16">9:16 (TikTok)</SelectItem>
                          <SelectItem value="16:9">16:9 (YouTube)</SelectItem>
                          <SelectItem value="1:1">1:1 (Instagram)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>動画の長さ</Label>
                      <Select value={String(duration)} onValueChange={(v) => setDuration(parseInt(v) as 5 | 10)}>
                        <SelectTrigger className="bg-zinc-800 border-zinc-700 mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-800 border-zinc-700">
                          <SelectItem value="5">5秒</SelectItem>
                          <SelectItem value="10">10秒</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>品質</Label>
                    <div className="flex gap-2 mt-2">
                      <Button
                        type="button"
                        variant={quality === 'standard' ? 'default' : 'outline'}
                        className={`flex-1 ${quality === 'standard' ? 'bg-purple-500' : 'border-zinc-700'}`}
                        onClick={() => setQuality('standard')}
                      >
                        Standard
                      </Button>
                      <Button
                        type="button"
                        variant={quality === 'pro' ? 'default' : 'outline'}
                        className={`flex-1 ${quality === 'pro' ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'border-zinc-700'}`}
                        onClick={() => setQuality('pro')}
                      >
                        Professional
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {/* Price Display */}
              <div className="p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">予想コスト</span>
                  <span className="text-2xl font-bold text-white">{formatPrice(estimatedPrice)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step: Generating */}
        {step === 'generating' && (
          <div className="py-12 text-center space-y-6">
            {videoStatus?.status === 'ready' ? (
              <>
                <div className="flex justify-center">
                  <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                </div>
                <div>
                  <p className="text-xl font-bold text-white">完成しました！</p>
                  <p className="text-zinc-400 mt-1">生成時間: {formatElapsedTime(elapsedTime)}</p>
                </div>
                <div className="flex justify-center gap-3">
                  <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false) }}>
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
            ) : videoStatus?.status === 'failed' ? (
              <>
                <div className="flex justify-center">
                  <div className="h-16 w-16 rounded-full bg-red-500/20 flex items-center justify-center">
                    <XCircle className="h-8 w-8 text-red-500" />
                  </div>
                </div>
                <p className="text-xl font-bold text-white">生成に失敗しました</p>
              </>
            ) : (
              <>
                <div className="flex justify-center">
                  <div className="h-16 w-16 rounded-full bg-purple-500/20 flex items-center justify-center animate-pulse">
                    <Wand2 className="h-8 w-8 text-purple-500" />
                  </div>
                </div>
                <div>
                  <p className="text-xl font-bold text-white">AI動画を生成中...</p>
                  <p className="text-zinc-400 mt-1">
                    {videoStatus?.message || '処理中...'} ({formatElapsedTime(elapsedTime)})
                  </p>
                </div>
                <Progress value={videoStatus?.progress || 0} className="max-w-xs mx-auto" />
              </>
            )}
          </div>
        )}

        {/* Footer Buttons */}
        {step !== 'generating' && (
          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <Button variant="ghost" onClick={() => { resetForm(); onOpenChange(false) }}>
              キャンセル
            </Button>
            {step === 'mode' && (
              <Button
                onClick={() => setStep('product')}
                disabled={!canProceed()}
                className="bg-gradient-to-r from-purple-500 to-pink-500"
              >
                次へ
              </Button>
            )}
            {step === 'product' && (
              <Button
                onClick={() => setStep('params')}
                disabled={!canProceed()}
                className="bg-gradient-to-r from-purple-500 to-pink-500"
              >
                次へ
              </Button>
            )}
            {step === 'params' && (
              <Button
                onClick={handleSubmit}
                disabled={!canProceed() || isSubmitting}
                className="bg-gradient-to-r from-purple-500 to-pink-500"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    生成中...
                  </>
                ) : (
                  '生成開始'
                )}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
