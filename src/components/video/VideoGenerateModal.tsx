'use client'

import { useState, useMemo } from 'react'
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
import { Loader2, Video, Sparkles, ArrowRight, ArrowLeft } from 'lucide-react'
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

interface VideoGenerateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Step = 'template' | 'product' | 'params' | 'preview'

interface TemplateOption {
  id: CompositionId
  name: string
  description: string
  duration: string
}

const templates: TemplateOption[] = [
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

export function VideoGenerateModal({ open, onOpenChange }: VideoGenerateModalProps) {
  const [step, setStep] = useState<Step>('template')
  const [selectedTemplate, setSelectedTemplate] = useState<CompositionId | null>(null)
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [title, setTitle] = useState('')

  // ProductIntro params
  const [catchCopy, setCatchCopy] = useState('')
  const [features, setFeatures] = useState(['', '', ''])
  const [ctaText, setCtaText] = useState('今すぐチェック')

  // BeforeAfter params
  const [beforeImage, setBeforeImage] = useState('')
  const [afterImage, setAfterImage] = useState('')

  // ReviewText params
  const [reviewText, setReviewText] = useState('')
  const [rating, setRating] = useState(5)
  const [reviewerName, setReviewerName] = useState('購入者')

  // FeatureList params
  const [featureItems, setFeatureItems] = useState([
    { icon: '✨', title: '', description: '' },
    { icon: '🎯', title: '', description: '' },
    { icon: '💪', title: '', description: '' },
  ])

  const { data: products = [] } = useProducts()
  const generateVideo = useGenerateVideo()

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId),
    [products, selectedProductId]
  )

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

  const handleNext = () => {
    if (step === 'template' && selectedTemplate) {
      setStep('product')
    } else if (step === 'product' && selectedProductId) {
      setStep('params')
    } else if (step === 'params') {
      setStep('preview')
    }
  }

  const handleBack = () => {
    if (step === 'product') {
      setStep('template')
    } else if (step === 'params') {
      setStep('product')
    } else if (step === 'preview') {
      setStep('params')
    }
  }

  const handleSave = async () => {
    if (!selectedTemplate || !selectedProductId || !inputProps) return

    const videoTitle = title || `${selectedProduct?.name} - ${templates.find((t) => t.id === selectedTemplate)?.name}`

    await generateVideo.mutateAsync({
      productId: selectedProductId,
      compositionId: selectedTemplate,
      title: videoTitle,
      inputProps,
    })

    // Reset and close
    resetForm()
    onOpenChange(false)
  }

  const resetForm = () => {
    setStep('template')
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
  }

  const canProceed = () => {
    if (step === 'template') return !!selectedTemplate
    if (step === 'product') return !!selectedProductId
    if (step === 'params') return true
    return false
  }

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
        <div className="flex items-center justify-center gap-2 py-4">
          {(['template', 'product', 'params', 'preview'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === s
                    ? 'bg-pink-500 text-white'
                    : ['template', 'product', 'params', 'preview'].indexOf(step) > i
                    ? 'bg-pink-500/30 text-pink-300'
                    : 'bg-zinc-800 text-zinc-500'
                }`}
              >
                {i + 1}
              </div>
              {i < 3 && (
                <div
                  className={`w-8 h-0.5 ${
                    ['template', 'product', 'params', 'preview'].indexOf(step) > i
                      ? 'bg-pink-500/30'
                      : 'bg-zinc-800'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Template Selection */}
        {step === 'template' && (
          <div className="space-y-4">
            <p className="text-zinc-400 text-sm">テンプレートを選択してください</p>
            <div className="grid grid-cols-2 gap-4">
              {templates.map((template) => (
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
            )}
          </div>
        )}

        {/* Step 3: Parameters */}
        {step === 'params' && selectedTemplate && (
          <div className="space-y-4">
            <p className="text-zinc-400 text-sm">動画のパラメータを設定してください</p>

            <div className="space-y-4">
              <div>
                <Label htmlFor="title">動画タイトル（任意）</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={`${selectedProduct?.name} - ${templates.find((t) => t.id === selectedTemplate)?.name}`}
                  className="bg-zinc-800 border-zinc-700 mt-1"
                />
              </div>

              {selectedTemplate === 'ProductIntro' && (
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

              {selectedTemplate === 'BeforeAfter' && (
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

              {selectedTemplate === 'ReviewText' && (
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

              {selectedTemplate === 'FeatureList' && (
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

        {/* Step 4: Preview */}
        {step === 'preview' && selectedTemplate && inputProps && (
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

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 'template'}
            className="border-zinc-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            戻る
          </Button>

          {step !== 'preview' ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="bg-pink-500 hover:bg-pink-600"
            >
              次へ
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSave}
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
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
