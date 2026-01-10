'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Upload, X, Plus } from 'lucide-react'

interface ProductFormProps {
  onSuccess?: () => void
  initialData?: {
    name: string
    description: string
    price: number
    images: string[]
    features: string[]
  }
}

export function ProductForm({ onSuccess, initialData }: ProductFormProps) {
  const [name, setName] = useState(initialData?.name || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [price, setPrice] = useState(initialData?.price?.toString() || '')
  const [features, setFeatures] = useState<string[]>(initialData?.features || [''])
  const [images, setImages] = useState<string[]>(initialData?.images || [])
  const [isLoading, setIsLoading] = useState(false)

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
    setIsLoading(true)

    try {
      // TODO: Implement Supabase insert
      console.log({
        name,
        description,
        price: parseFloat(price),
        features: features.filter((f) => f.trim() !== ''),
        images,
      })

      onSuccess?.()
    } catch (error) {
      console.error('Error saving product:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
                  size="icon"
                  onClick={() => removeFeature(index)}
                  className="text-zinc-400 hover:text-red-500"
                >
                  <X className="h-4 w-4" />
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
                className="absolute top-1 right-1 h-6 w-6 bg-black/50 hover:bg-black/70 text-white"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <label className="aspect-square rounded-lg border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center cursor-pointer hover:border-zinc-600 transition-colors">
            <Upload className="h-6 w-6 text-zinc-500 mb-2" />
            <span className="text-xs text-zinc-500">アップロード</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                // TODO: Implement image upload to Supabase Storage
                const file = e.target.files?.[0]
                if (file) {
                  const reader = new FileReader()
                  reader.onloadend = () => {
                    setImages([...images, reader.result as string])
                  }
                  reader.readAsDataURL(file)
                }
              }}
            />
          </label>
        </div>
      </div>

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
          {isLoading ? '保存中...' : '商品を保存'}
        </Button>
      </div>
    </form>
  )
}
