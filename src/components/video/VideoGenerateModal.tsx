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
import { Loader2, Video, Sparkles, ArrowRight, ArrowLeft, Wand2, Film, X, CheckCircle, XCircle, Layers, ExternalLink, Plus } from 'lucide-react'
import { RemotionPreview } from './RemotionPreview'
import { useProducts } from '@/hooks/useProducts'
import {
  useGenerateVideo,
  CompositionId,
  ProductIntroProps,
  BeforeAfterProps,
  ReviewTextProps,
  FeatureListProps,
} from '@/hooks/useGenerateVideo'
import { useKlingGenerate } from '@/hooks/useKlingGenerate'
import { useVideoStatus, useCancelVideo } from '@/hooks/useVideoStatus'
import { KLING_PRESETS, type PromptPreset } from '@/lib/video/kling/prompts'

interface VideoGenerateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenVariantModal?: (videoId: string, videoTitle: string) => void
}

type GenerationMode = 'remotion' | 'kling'
type Step = 'mode' | 'template' | 'product' | 'params' | 'preview' | 'generating'

interface TemplateOption {
  id: CompositionId
  name: string
  description: string
  duration: string
}

const remotionTemplates: TemplateOption[] = [
  {
    id: 'ProductIntro',
    name: '商品紹介',
    description: '商品画像とキャッチコピーで訴求',
    duration: '15秒',
  },
  {
    id: 'BeforeAfter',
    name: 'Before/After',
    description: '使用前後の比較で効果をアピール',
    duration: '12秒',
  },
  {
    id: 'ReviewText',
    name: 'レビュー風',
    description: 'ユーザーレビュー風のテキストアニメ',
    duration: '10秒',
  },
  {
    id: 'FeatureList',
    name: '特徴リスト',
    description: '商品の特徴を順番にアニメーション',
    duration: '15秒',
  },
]

export function VideoGenerateModal({ open, onOpenChange, onOpenVariantModal }: VideoGenerateModalProps) {
  // モード選択
  const [generationMode, setGenerationMode] = useState<GenerationMode | null>(null)

  // 共通State
  const [step, setStep] = useState<Step>('mode')
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [title, setTitle] = useState('')

  // Remotion用State
  const [selectedTemplate, setSelectedTemplate] = useState<CompositionId | null>(null)
  const [catchCopy, setCatchCopy] = useState('')
  const [features, setFeatures] = useState(['', '', ''])
  const [ctaText, setCtaText] = useState('今すぐチェック')
  const [beforeImage, setBeforeImage] = useState('')
  const [afterImage, setAfterImage] = useState('')
  const [reviewText, setReviewText] = useState('')
  const [rating, setRating] = useState(5)
  const [reviewerName, setReviewerName] = useState('購入者')
  const [featureItems, setFeatureItems] = useState([
    { icon: '✨', title: '', description: '' },
    { icon: '🎯', title: '', description: '' },
    { icon: '💪', title: '', description: '' },
  ])

  // Kling用State
  const [selectedPreset, setSelectedPreset] = useState<PromptPreset>(KLING_PRESETS[0])
  const [customPrompt, setCustomPrompt] = useState('')
  const [klingDuration, setKlingDuration] = useState<5 | 10>(5)

  // 生成中State
  const [generatingVideoId, setGeneratingVideoId] = useState<string | null>(null)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)

  const { data: products = [] } = useProducts()
  const generateVideo = useGenerateVideo()
  const generateKling = useKlingGenerate()
  const cancelVideo = useCancelVideo()
  const { data: videoStatus } = useVideoStatus(generatingVideoId, {
    enabled: !!generatingVideoId && step === 'generating',
    pollInterval: 2000,
  })

  // 経過時間の更新
  useEffect(() => {
    if (step !== 'generating' || !startTime) return

    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)

    return () => clearInterval(interval)
  }, [step, startTime])

  // 生成完了/失敗時の処理（自動クローズを削除し、ユーザーに次のアクションを選ばせる）
  // 失敗・キャンセル時のみ3秒後に自動で閉じる
  useEffect(() => {
    if (!videoStatus) return

    if (videoStatus.status === 'failed' || videoStatus.status === 'cancelled') {
      const timeout = setTimeout(() => {
        resetForm()
        onOpenChange(false)
      }, 3000)

      return () => clearTimeout(timeout)
    }
  }, [videoStatus, onOpenChange])

  // 次のアクション: バリアント生成
  const handleCreateVariants = () => {
    if (generatingVideoId) {
      const videoTitle = title || `${selectedProduct?.name || '商品'} - AI生成`
      onOpenVariantModal?.(generatingVideoId, videoTitle)
      resetForm()
      onOpenChange(false)
    }
  }

  // 次のアクション: 動画一覧へ
  const handleGoToVideos = () => {
    resetForm()
    onOpenChange(false)
    window.location.href = '/videos'
  }

  // 次のアクション: もう1本生成
  const handleGenerateAnother = () => {
    setGeneratingVideoId(null)
    setStartTime(null)
    setElapsedTime(0)
    setStep('mode')
    setGenerationMode(null)
  }

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId),
    [products, selectedProductId]
  )

  // Remotion用InputProps
  const inputProps = useMemo(() => {
    if (!selectedTemplate || !selectedProduct) return null

    const baseProps = {
      productName: selectedProduct.name,
      productImage: selectedProduct.images[0] || '',
      backgroundColor: '#000000',
      accentColor: '#ec4899',
    }

    switch (selectedTemplate) {
      case 'ProductIntro':
        return {
          ...baseProps,
          price: selectedProduct.price,
          catchCopy: catchCopy || 'これ1つで変わる',
          features: features.filter(Boolean).length > 0 ? features.filter(Boolean) : ['特徴1', '特徴2', '特徴3'],
          ctaText,
        } as ProductIntroProps

      case 'BeforeAfter':
        return {
          ...baseProps,
          beforeImage: beforeImage || selectedProduct.images[0] || '',
          afterImage: afterImage || selectedProduct.images[1] || selectedProduct.images[0] || '',
          beforeLabel: 'Before',
          afterLabel: 'After',
          transitionStyle: 'slide' as const,
        } as BeforeAfterProps

      case 'ReviewText':
        return {
          ...baseProps,
          reviewText: reviewText || 'これ使い始めてから本当に変わった...',
          rating,
          reviewerName,
        } as ReviewTextProps

      case 'FeatureList':
        return {
          ...baseProps,
          features: featureItems.filter((f) => f.title).length > 0
            ? featureItems.filter((f) => f.title)
            : [
                { icon: '✨', title: '特徴1', description: '説明文' },
                { icon: '🎯', title: '特徴2', description: '説明文' },
                { icon: '💪', title: '特徴3', description: '説明文' },
              ],
        } as FeatureListProps

      default:
        return null
    }
  }, [
    selectedTemplate,
    selectedProduct,
    catchCopy,
    features,
    ctaText,
    beforeImage,
    afterImage,
    reviewText,
    rating,
    reviewerName,
    featureItems,
  ])

  // Kling用プロンプト
  const klingPrompt = useMemo(() => {
    if (selectedPreset.id === 'custom') {
      return customPrompt
    }
    return `${selectedPreset.prompt}, featuring "${selectedProduct?.name || 'product'}"`
  }, [selectedPreset, customPrompt, selectedProduct])

  const handleNext = () => {
    if (step === 'mode' && generationMode) {
      if (generationMode === 'remotion') {
        setStep('template')
      } else {
        setStep('product')
      }
    } else if (step === 'template' && selectedTemplate) {
      setStep('product')
    } else if (step === 'product' && selectedProductId) {
      setStep('params')
    } else if (step === 'params') {
      if (generationMode === 'kling') {
        // Klingは直接生成（プレビューなし）
        handleKlingSave()
      } else {
        setStep('preview')
      }
    }
  }

  const handleBack = () => {
    if (step === 'template') {
      setStep('mode')
    } else if (step === 'product') {
      if (generationMode === 'remotion') {
        setStep('template')
      } else {
        setStep('mode')
      }
    } else if (step === 'params') {
      setStep('product')
    } else if (step === 'preview') {
      setStep('params')
    }
  }

  const handleRemotionSave = async () => {
    if (!selectedTemplate || !selectedProductId || !inputProps) return

    const videoTitle = title || `${selectedProduct?.name} - ${remotionTemplates.find((t) => t.id === selectedTemplate)?.name}`

    await generateVideo.mutateAsync({
      productId: selectedProductId,
      compositionId: selectedTemplate,
      title: videoTitle,
      inputProps,
    })

    resetForm()
    onOpenChange(false)
  }

  const handleKlingSave = async () => {
    if (!selectedProductId || !klingPrompt) return

    const videoTitle = title || `${selectedProduct?.name} - AI生成（${selectedPreset.labelJa}）`

    try {
      const result = await generateKling.mutateAsync({
        productId: selectedProductId,
        mode: 'image-to-video',
        imageUrl: selectedProduct?.images[0],
        prompt: klingPrompt,
        negativePrompt: selectedPreset.negativePrompt,
        duration: klingDuration,
        presetId: selectedPreset.id,
        title: videoTitle,
      })

      // 生成画面に遷移
      if (result?.video?.id) {
        setGeneratingVideoId(result.video.id)
        setStartTime(Date.now())
        setElapsedTime(0)
        setStep('generating')
      }
    } catch {
      // エラーはuseKlingGenerateで処理される
    }
  }

  const handleCancel = async () => {
    if (!generatingVideoId) return

    try {
      await cancelVideo.mutateAsync(generatingVideoId)
    } catch {
      // エラーは無視（既に完了している可能性など）
    }
  }

  const formatElapsedTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}分${secs.toString().padStart(2, '0')}秒`
  }

  const resetForm = () => {
    setGenerationMode(null)
    setStep('mode')
    setSelectedTemplate(null)
    setSelectedProductId('')
    setTitle('')
    setCatchCopy('')
    setFeatures(['', '', ''])
    setCtaText('今すぐチェック')
    setBeforeImage('')
    setAfterImage('')
    setReviewText('')
    setRating(5)
    setReviewerName('購入者')
    setFeatureItems([
      { icon: '✨', title: '', description: '' },
      { icon: '🎯', title: '', description: '' },
      { icon: '💪', title: '', description: '' },
    ])
    setSelectedPreset(KLING_PRESETS[0])
    setCustomPrompt('')
    setKlingDuration(5)
    // 生成中State
    setGeneratingVideoId(null)
    setStartTime(null)
    setElapsedTime(0)
  }

  const canProceed = () => {
    if (step === 'mode') return !!generationMode
    if (step === 'template') return !!selectedTemplate
    if (step === 'product') return !!selectedProductId
    if (step === 'params') {
      if (generationMode === 'kling') {
        return !!klingPrompt
      }
      return true
    }
    return false
  }

  const getSteps = (): Step[] => {
    if (step === 'generating') {
      // 生成中は進捗表示のみ
      return ['generating']
    }
    if (generationMode === 'remotion') {
      return ['mode', 'template', 'product', 'params', 'preview']
    } else if (generationMode === 'kling') {
      return ['mode', 'product', 'params']
    }
    return ['mode']
  }

  const steps = getSteps()
  const currentStepIndex = steps.indexOf(step)

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o) }}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-pink-500" />
            動画を生成
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        {step !== 'generating' && (
        <div className="flex items-center justify-center gap-2 py-4">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === s
                    ? 'bg-pink-500 text-white'
                    : currentStepIndex > i
                    ? 'bg-pink-500/30 text-pink-300'
                    : 'bg-zinc-800 text-zinc-500'
                }`}
              >
                {i + 1}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`w-8 h-0.5 ${
                    currentStepIndex > i
                      ? 'bg-pink-500/30'
                      : 'bg-zinc-800'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        )}

        {/* Step 0: Mode Selection */}
        {step === 'mode' && (
          <div className="space-y-4">
            <p className="text-zinc-400 text-sm">生成方法を選択してください</p>
            <div className="grid grid-cols-2 gap-4">
              <Card
                className={`cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${
                  generationMode === 'kling'
                    ? 'bg-pink-500/20 border-pink-500'
                    : 'bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800'
                }`}
                onClick={() => setGenerationMode('kling')}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
                      <Wand2 className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-white text-lg">AI生成（Kling）</p>
                      <p className="text-sm text-zinc-400 mt-1">
                        商品画像からWebCM風の高品質動画を自動生成
                      </p>
                      <p className="text-xs text-pink-400 mt-2">おすすめ</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${
                  generationMode === 'remotion'
                    ? 'bg-pink-500/20 border-pink-500'
                    : 'bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800'
                }`}
                onClick={() => setGenerationMode('remotion')}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-700">
                      <Film className="h-7 w-7 text-zinc-300" />
                    </div>
                    <div>
                      <p className="font-bold text-white text-lg">テンプレート</p>
                      <p className="text-sm text-zinc-400 mt-1">
                        Remotionテンプレートでモーショングラフィックス動画を作成
                      </p>
                      <p className="text-xs text-zinc-500 mt-2">即時生成</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Step 1: Template Selection (Remotion only) */}
        {step === 'template' && generationMode === 'remotion' && (
          <div className="space-y-4">
            <p className="text-zinc-400 text-sm">テンプレートを選択してください</p>
            <div className="grid grid-cols-2 gap-4">
              {remotionTemplates.map((template) => (
                <Card
                  key={template.id}
                  className={`cursor-pointer transition-all ${
                    selectedTemplate === template.id
                      ? 'bg-pink-500/20 border-pink-500'
                      : 'bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800'
                  }`}
                  onClick={() => setSelectedTemplate(template.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-500/10">
                        <Video className="h-5 w-5 text-pink-500" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{template.name}</p>
                        <p className="text-sm text-zinc-400">{template.description}</p>
                        <p className="text-xs text-zinc-500 mt-1">{template.duration}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Product Selection */}
        {step === 'product' && (
          <div className="space-y-4">
            <p className="text-zinc-400 text-sm">動画に使用する商品を選択してください</p>
            {products.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-zinc-400">商品がありません</p>
                <p className="text-sm text-zinc-500 mt-1">
                  先に商品を登録してください
                </p>
              </div>
            ) : (
              <div className="space-y-4">
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

                {/* 選択された商品のプレビュー */}
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
          </div>
        )}

        {/* Step 3: Parameters */}
        {step === 'params' && (
          <div className="space-y-4">
            <p className="text-zinc-400 text-sm">
              {generationMode === 'kling'
                ? 'AI動画生成の設定をしてください'
                : '動画のパラメータを設定してください'}
            </p>

            <div className="space-y-4">
              <div>
                <Label htmlFor="title">動画タイトル（任意）</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    generationMode === 'kling'
                      ? `${selectedProduct?.name} - AI生成`
                      : `${selectedProduct?.name} - ${remotionTemplates.find((t) => t.id === selectedTemplate)?.name}`
                  }
                  className="bg-zinc-800 border-zinc-700 mt-1"
                />
              </div>

              {/* Kling用パラメータ */}
              {generationMode === 'kling' && (
                <>
                  <div>
                    <Label>スタイルプリセット</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {KLING_PRESETS.filter(p => p.id !== 'custom').map((preset) => (
                        <Card
                          key={preset.id}
                          className={`cursor-pointer transition-all ${
                            selectedPreset.id === preset.id
                              ? 'bg-pink-500/20 border-pink-500'
                              : 'bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800'
                          }`}
                          onClick={() => setSelectedPreset(preset)}
                        >
                          <CardContent className="p-3">
                            <p className="font-medium text-white text-sm">{preset.labelJa}</p>
                            <p className="text-xs text-zinc-400 mt-1">{preset.description}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>カスタムプロンプト（任意）</Label>
                    <Textarea
                      value={customPrompt}
                      onChange={(e) => {
                        setCustomPrompt(e.target.value)
                        if (e.target.value) {
                          setSelectedPreset(KLING_PRESETS.find(p => p.id === 'custom')!)
                        }
                      }}
                      placeholder="独自のプロンプトを入力（英語推奨）"
                      className="bg-zinc-800 border-zinc-700 mt-1"
                      rows={3}
                    />
                    <p className="text-xs text-zinc-500 mt-1">
                      プリセットの代わりにカスタムプロンプトを使用する場合に入力
                    </p>
                  </div>

                  <div>
                    <Label>動画の長さ</Label>
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant={klingDuration === 5 ? 'default' : 'outline'}
                        className={klingDuration === 5 ? 'bg-pink-500' : 'border-zinc-700'}
                        onClick={() => setKlingDuration(5)}
                      >
                        5秒（$0.16）
                      </Button>
                      <Button
                        variant={klingDuration === 10 ? 'default' : 'outline'}
                        className={klingDuration === 10 ? 'bg-pink-500' : 'border-zinc-700'}
                        onClick={() => setKlingDuration(10)}
                      >
                        10秒（$0.32）
                      </Button>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                    <p className="text-sm text-yellow-200">
                      AI動画生成には1〜3分かかります。生成完了後、動画一覧に表示されます。
                    </p>
                  </div>
                </>
              )}

              {/* Remotion用パラメータ */}
              {generationMode === 'remotion' && selectedTemplate === 'ProductIntro' && (
                <>
                  <div>
                    <Label htmlFor="catchCopy">キャッチコピー</Label>
                    <Input
                      id="catchCopy"
                      value={catchCopy}
                      onChange={(e) => setCatchCopy(e.target.value)}
                      placeholder="これ1つで変わる"
                      className="bg-zinc-800 border-zinc-700 mt-1"
                    />
                  </div>
                  <div>
                    <Label>特徴（最大3つ）</Label>
                    {features.map((feature, i) => (
                      <Input
                        key={i}
                        value={feature}
                        onChange={(e) => {
                          const newFeatures = [...features]
                          newFeatures[i] = e.target.value
                          setFeatures(newFeatures)
                        }}
                        placeholder={`特徴${i + 1}`}
                        className="bg-zinc-800 border-zinc-700 mt-1"
                      />
                    ))}
                  </div>
                  <div>
                    <Label htmlFor="ctaText">CTAテキスト</Label>
                    <Input
                      id="ctaText"
                      value={ctaText}
                      onChange={(e) => setCtaText(e.target.value)}
                      placeholder="今すぐチェック"
                      className="bg-zinc-800 border-zinc-700 mt-1"
                    />
                  </div>
                </>
              )}

              {generationMode === 'remotion' && selectedTemplate === 'BeforeAfter' && (
                <>
                  <div>
                    <Label htmlFor="beforeImage">Before画像URL（任意）</Label>
                    <Input
                      id="beforeImage"
                      value={beforeImage}
                      onChange={(e) => setBeforeImage(e.target.value)}
                      placeholder="商品画像を使用"
                      className="bg-zinc-800 border-zinc-700 mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="afterImage">After画像URL（任意）</Label>
                    <Input
                      id="afterImage"
                      value={afterImage}
                      onChange={(e) => setAfterImage(e.target.value)}
                      placeholder="商品画像を使用"
                      className="bg-zinc-800 border-zinc-700 mt-1"
                    />
                  </div>
                </>
              )}

              {generationMode === 'remotion' && selectedTemplate === 'ReviewText' && (
                <>
                  <div>
                    <Label htmlFor="reviewText">レビューテキスト</Label>
                    <Textarea
                      id="reviewText"
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      placeholder="これ使い始めてから本当に変わった..."
                      className="bg-zinc-800 border-zinc-700 mt-1"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="reviewerName">レビュアー名</Label>
                    <Input
                      id="reviewerName"
                      value={reviewerName}
                      onChange={(e) => setReviewerName(e.target.value)}
                      placeholder="購入者"
                      className="bg-zinc-800 border-zinc-700 mt-1"
                    />
                  </div>
                  <div>
                    <Label>評価</Label>
                    <Select value={rating.toString()} onValueChange={(v) => setRating(Number(v))}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700">
                        {[5, 4, 3, 2, 1].map((r) => (
                          <SelectItem key={r} value={r.toString()}>
                            {'★'.repeat(r)}{'☆'.repeat(5 - r)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {generationMode === 'remotion' && selectedTemplate === 'FeatureList' && (
                <div>
                  <Label>特徴リスト</Label>
                  {featureItems.map((item, i) => (
                    <div key={i} className="flex gap-2 mt-2">
                      <Input
                        value={item.icon}
                        onChange={(e) => {
                          const newItems = [...featureItems]
                          newItems[i].icon = e.target.value
                          setFeatureItems(newItems)
                        }}
                        placeholder="絵文字"
                        className="bg-zinc-800 border-zinc-700 w-16"
                      />
                      <Input
                        value={item.title}
                        onChange={(e) => {
                          const newItems = [...featureItems]
                          newItems[i].title = e.target.value
                          setFeatureItems(newItems)
                        }}
                        placeholder="タイトル"
                        className="bg-zinc-800 border-zinc-700 flex-1"
                      />
                      <Input
                        value={item.description}
                        onChange={(e) => {
                          const newItems = [...featureItems]
                          newItems[i].description = e.target.value
                          setFeatureItems(newItems)
                        }}
                        placeholder="説明"
                        className="bg-zinc-800 border-zinc-700 flex-1"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Preview (Remotion only) */}
        {step === 'preview' && generationMode === 'remotion' && selectedTemplate && inputProps && (
          <div className="space-y-4">
            <p className="text-zinc-400 text-sm">プレビューを確認して保存してください</p>
            <div className="flex justify-center">
              <RemotionPreview
                compositionId={selectedTemplate}
                inputProps={inputProps as unknown as Record<string, unknown>}
                width={270}
                height={480}
                autoPlay={true}
                loop={true}
                controls={true}
              />
            </div>
          </div>
        )}

        {/* Step: Generating (Kling AI) */}
        {step === 'generating' && (
          <div className="space-y-6 py-4">
            {/* ステータスアイコン */}
            <div className="flex justify-center">
              {videoStatus?.status === 'ready' ? (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20">
                  <CheckCircle className="h-10 w-10 text-green-500" />
                </div>
              ) : videoStatus?.status === 'failed' ? (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/20">
                  <XCircle className="h-10 w-10 text-red-500" />
                </div>
              ) : videoStatus?.status === 'cancelled' ? (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-zinc-500/20">
                  <X className="h-10 w-10 text-zinc-400" />
                </div>
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                  <Wand2 className="h-10 w-10 text-pink-500 animate-pulse" />
                </div>
              )}
            </div>

            {/* ステータスメッセージ */}
            <div className="text-center">
              <h3 className="text-xl font-bold text-white">
                {videoStatus?.status === 'ready'
                  ? '生成完了!'
                  : videoStatus?.status === 'failed'
                  ? '生成に失敗しました'
                  : videoStatus?.status === 'cancelled'
                  ? 'キャンセルしました'
                  : 'AI動画を生成中...'}
              </h3>
              <p className="text-sm text-zinc-400 mt-1">
                {videoStatus?.message || '処理を開始しています...'}
              </p>
            </div>

            {/* プログレスバー */}
            {videoStatus?.status === 'generating' && (
              <div className="space-y-2">
                <Progress
                  value={videoStatus?.progress || 0}
                  className="h-3 bg-zinc-800"
                />
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">進捗</span>
                  <span className="text-pink-400 font-medium">
                    {videoStatus?.progress || 0}%
                  </span>
                </div>
              </div>
            )}

            {/* 経過時間 */}
            <div className="text-center">
              <span className="text-sm text-zinc-500">
                経過時間: {formatElapsedTime(elapsedTime)}
              </span>
            </div>

            {/* 完了後の継続トリガー - 次のアクション選択 */}
            {videoStatus?.status === 'ready' && (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-center">
                  <p className="text-sm text-green-200">
                    動画が正常に生成されました！次に何をしますか？
                  </p>
                </div>

                {/* 次のアクションボタン */}
                <div className="grid grid-cols-1 gap-3">
                  {/* バリアント生成（推奨） */}
                  <Button
                    onClick={handleCreateVariants}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 h-14 text-base transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Layers className="mr-2 h-5 w-5" />
                    A/Bテスト用バリアントを生成
                    <span className="ml-2 text-xs bg-white/20 px-2 py-0.5 rounded-full">おすすめ</span>
                  </Button>

                  <div className="grid grid-cols-2 gap-3">
                    {/* もう1本生成 */}
                    <Button
                      onClick={handleGenerateAnother}
                      variant="outline"
                      className="h-12 border-zinc-600 hover:bg-zinc-800 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      もう1本生成
                    </Button>

                    {/* 動画一覧へ */}
                    <Button
                      onClick={handleGoToVideos}
                      variant="outline"
                      className="h-12 border-zinc-600 hover:bg-zinc-800 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      動画一覧を見る
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* 失敗メッセージ */}
            {videoStatus?.status === 'failed' && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-center">
                <p className="text-sm text-red-200">
                  再度お試しください。3秒後に自動で閉じます...
                </p>
              </div>
            )}

            {/* キャンセルボタン */}
            {videoStatus?.status === 'generating' && (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={cancelVideo.isPending}
                  className="border-zinc-600 text-zinc-400 hover:text-white hover:border-zinc-500"
                >
                  {cancelVideo.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      キャンセル中...
                    </>
                  ) : (
                    <>
                      <X className="mr-2 h-4 w-4" />
                      キャンセル
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        {step !== 'generating' && (
        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 'mode'}
            className="border-zinc-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            戻る
          </Button>

          {step === 'preview' ? (
            <Button
              onClick={handleRemotionSave}
              disabled={generateVideo.isPending}
              className="bg-pink-500 hover:bg-pink-600"
            >
              {generateVideo.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                '保存'
              )}
            </Button>
          ) : step === 'params' && generationMode === 'kling' ? (
            <Button
              onClick={handleKlingSave}
              disabled={generateKling.isPending || !canProceed()}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {generateKling.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  生成開始中...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  AI動画を生成
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="bg-pink-500 hover:bg-pink-600"
            >
              次へ
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
