'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Upload, X, Plus, Loader2, Link, Sparkles } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { useCreateProduct, useUpdateProduct } from '@/hooks/useProducts'
import { useOptimizedUpload } from '@/hooks/useOptimizedUpload'
import { useScrape } from '@/hooks/useScrape'
import { toast } from 'sonner'

interface ProductFormProps {
  onSuccess?: () => void
  productId?: string
  initialData?: {
    name: string
    description: string
    price: number
    images: string[]
    features: string[]
  }
}

export function ProductForm({ onSuccess, productId, initialData }: ProductFormProps) {
  const [name, setName] = useState(initialData?.name || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [price, setPrice] = useState(initialData?.price?.toString() || '')
  const [features, setFeatures] = useState<string[]>(initialData?.features || [''])
  const [images, setImages] = useState<string[]>(initialData?.images || [])
  const [error, setError] = useState<string | null>(null)
  // LLM分析フィールド
  const [category, setCategory] = useState('')
  const [brand, setBrand] = useState('')
  const [targetAudience, setTargetAudience] = useState('')

  const [productUrl, setProductUrl] = useState('')

  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const { upload, isUploading: uploading, progress: uploadProgress } = useOptimizedUpload({
    generateThumbnails: true,
    format: 'webp',
    quality: 85,
  })
  const { scrape, isLoading: isScraping, error: scrapeError } = useScrape()
  const isLoading = createProduct.isPending || updateProduct.isPending

  const handleScrape = async () => {
    if (!productUrl.trim()) return

    const result = await scrape(productUrl)
    if (result) {
      setName(result.name || '')
      setDescription(result.description || '')
      if (result.price) {
        setPrice(result.price.toString())
      }
      if (result.features && result.features.length > 0) {
        setFeatures(result.features)
      }
      if (result.images && result.images.length > 0) {
        setImages(result.images)
      }
      // LLM分析フィールド
      if (result.category) setCategory(result.category)
      if (result.brand) setBrand(result.brand)
      if (result.targetAudience) setTargetAudience(result.targetAudience)

      toast.success('商品情報を自動入力しました', {
        description: result.name ? `「${result.name}」の情報を取得しました` : undefined,
      })
    }
  }

  const addFeature = () => {
    setFeatures([...features, ''])
  }

  const removeFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index))
  }

  const updateFeature = (index: number, value: string) => {
    const newFeatures = [...features]
    newFeatures[index] = value
    setFeatures(newFeatures)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const productData = {
      name,
      description: description || null,
      price: parseFloat(price),
      features: features.filter((f) => f.trim() !== ''),
      images,
      video_urls: [],
    }

    try {
      if (productId) {
        await updateProduct.mutateAsync({ id: productId, product: productData })
        toast.success('商品を更新しました')
      } else {
        await createProduct.mutateAsync(productData)
        toast.success('商品を保存しました', {
          description: '動画生成ページから動画を作成できます',
        })
      }
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました')
      toast.error('保存に失敗しました')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* URL Auto-fill */}
      <div className="space-y-2 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
        <Label className="text-white flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-pink-500" />
          URLから自動入力
        </Label>
        <p className="text-xs text-zinc-400 mb-2">
          Amazon・楽天・一般サイトの商品URLを入力すると、商品情報を自動で取得します
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              value={productUrl}
              onChange={(e) => setProductUrl(e.target.value)}
              placeholder="https://www.amazon.co.jp/dp/..."
              className="bg-zinc-900 border-zinc-700 pl-10"
              disabled={isScraping}
            />
          </div>
          <Button
            type="button"
            onClick={handleScrape}
            disabled={isScraping || !productUrl.trim()}
            className="bg-pink-500 hover:bg-pink-600 whitespace-nowrap"
          >
            {isScraping ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                取得中...
              </>
            ) : (
              '自動入力'
            )}
          </Button>
        </div>
        {isScraping && (
          <p className="text-xs text-zinc-400 mt-1">
            サイトから商品情報を取得しています（通常10〜30秒）
          </p>
        )}
        {scrapeError && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 mt-2">
            <p className="text-xs text-red-300 font-medium">情報取得に失敗しました</p>
            <p className="text-xs text-red-400 mt-1">
              {scrapeError.toLowerCase().includes('404') || scrapeError.toLowerCase().includes('not found')
                ? 'URLが見つかりません。商品ページのURLを確認してください'
                : scrapeError.toLowerCase().includes('timeout')
                ? 'サイトの読み込みがタイムアウトしました。時間をおいて再度お試しください'
                : scrapeError.toLowerCase().includes('network') || scrapeError.toLowerCase().includes('fetch')
                ? 'ネットワークエラーが発生しました。接続を確認してください'
                : 'URLから情報を自動取得できませんでした。手動で入力してください'}
            </p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="mt-2 text-red-400 hover:text-red-300 h-auto p-1 text-xs"
              onClick={() => setProductUrl('')}
            >
              URLをクリアして手動入力
            </Button>
          </div>
        )}
      </div>

      {/* Product Name */}
      <div className="space-y-2">
        <Label htmlFor="name" className="text-white">
          商品名 <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: 美肌クリーム"
          className="bg-zinc-800 border-zinc-700"
          required
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-white">
          説明
        </Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="商品の説明を入力..."
          className="bg-zinc-800 border-zinc-700 min-h-[100px]"
        />
      </div>

      {/* Price */}
      <div className="space-y-2">
        <Label htmlFor="price" className="text-white">
          価格 <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
            ¥
          </span>
          <Input
            id="price"
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0"
            className="bg-zinc-800 border-zinc-700 pl-8"
            required
          />
        </div>
      </div>

      {/* LLM分析フィールド（自動入力時のみ表示） */}
      {(category || brand || targetAudience) && (
        <div className="p-4 bg-zinc-800/30 rounded-lg border border-zinc-700/50">
          <p className="text-xs text-zinc-400 mb-3">AI分析による自動取得情報</p>
          <div className="flex flex-wrap gap-2">
            {category && (
              <span className="px-2 py-1 text-xs bg-zinc-700 text-zinc-300 rounded">
                {category}
              </span>
            )}
            {brand && (
              <span className="px-2 py-1 text-xs bg-zinc-700 text-zinc-300 rounded">
                {brand}
              </span>
            )}
            {targetAudience && (
              <span className="px-2 py-1 text-xs bg-zinc-700 text-zinc-300 rounded">
                {targetAudience}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Features */}
      <div className="space-y-2">
        <Label className="text-white">商品の特徴・USP</Label>
        <div className="space-y-2">
          {features.map((feature, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={feature}
                onChange={(e) => updateFeature(index, e.target.value)}
                placeholder={`特徴 ${index + 1}`}
                className="bg-zinc-800 border-zinc-700"
              />
              {features.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  onClick={() => removeFeature(index)}
                  className="text-zinc-400 hover:text-red-500 min-w-[44px] min-h-[44px]"
                >
                  <X className="h-5 w-5" />
                </Button>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addFeature}
            className="border-zinc-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            特徴を追加
          </Button>
        </div>
      </div>

      {/* Images */}
      <div className="space-y-2">
        <Label className="text-white">商品画像</Label>
        <div className="grid grid-cols-3 gap-4">
          {images.map((image, index) => (
            <div
              key={index}
              className="relative aspect-square rounded-lg bg-zinc-800 overflow-hidden"
            >
              <img
                src={image}
                alt={`Product ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setImages(images.filter((_, i) => i !== index))}
                className="absolute top-1 right-1 min-w-[44px] min-h-[44px] bg-black/50 hover:bg-black/70 text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <label className={`aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center transition-all ${uploading ? 'border-pink-500 bg-pink-500/10 cursor-not-allowed' : 'border-zinc-700 cursor-pointer hover:border-pink-500/50 hover:bg-zinc-800/50'}`}>
            {uploading ? (
              <div className="flex flex-col items-center w-full px-4">
                <Loader2 className="h-6 w-6 text-pink-500 animate-spin mb-2" />
                <Progress value={uploadProgress} className="h-1.5 w-full bg-zinc-700" />
                <span className="text-xs text-pink-500 mt-2 font-medium">{uploadProgress}%</span>
              </div>
            ) : (
              <>
                <Upload className="h-6 w-6 text-zinc-500 mb-2 transition-transform group-hover:scale-110" />
                <span className="text-xs text-zinc-500">アップロード</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (file) {
                  const result = await upload(file)
                  if (result?.image?.url) {
                    setImages([...images, result.image.url])
                    toast.success('画像をアップロードしました')
                  }
                }
                e.target.value = ''
              }}
            />
          </label>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 text-sm text-red-500 bg-red-500/10 rounded-md">
          {error}
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          className="border-zinc-700"
          onClick={() => onSuccess?.()}
        >
          キャンセル
        </Button>
        <Button
          type="submit"
          className="bg-pink-500 hover:bg-pink-600"
          disabled={isLoading}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? '保存中...' : productId ? '商品を更新' : '商品を保存'}
        </Button>
      </div>
    </form>
  )
}
