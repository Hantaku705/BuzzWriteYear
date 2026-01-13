'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  Upload,
  Link2,
  X,
  Video,
  Plus,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

interface UGCStyleUploaderProps {
  urls: string[]
  onUrlsChange: (urls: string[]) => void
  minCount?: number
  maxCount?: number
  disabled?: boolean
}

interface UploadedFile {
  name: string
  url: string
  size: number
  type: 'file' | 'url'
}

export function UGCStyleUploader({
  urls,
  onUrlsChange,
  minCount = 5,
  maxCount = 20,
  disabled = false,
}: UGCStyleUploaderProps) {
  const [urlInput, setUrlInput] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})

  // Handle file upload to Supabase Storage
  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bucket', 'videos')
      formData.append('path', `ugc-style-samples/${Date.now()}-${file.name}`)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'アップロードに失敗しました')
      }

      const data = await response.json()
      return data.url
    } catch (error) {
      console.error('Upload error:', error)
      return null
    }
  }

  // Handle dropped files
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (disabled) return
      if (urls.length + acceptedFiles.length > maxCount) {
        toast.error(`最大${maxCount}本までアップロードできます`)
        return
      }

      setIsUploading(true)
      const newUrls: string[] = []

      for (const file of acceptedFiles) {
        setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }))

        const url = await uploadFile(file)
        if (url) {
          newUrls.push(url)
          setUploadProgress((prev) => ({ ...prev, [file.name]: 100 }))
        } else {
          toast.error(`${file.name}のアップロードに失敗しました`)
        }
      }

      if (newUrls.length > 0) {
        onUrlsChange([...urls, ...newUrls])
        toast.success(`${newUrls.length}本の動画をアップロードしました`)
      }

      setIsUploading(false)
      setUploadProgress({})
    },
    [urls, onUrlsChange, disabled, maxCount]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.webm'],
    },
    disabled: disabled || isUploading,
    maxFiles: maxCount - urls.length,
  })

  // Add URL (TikTok or direct video URL)
  const handleAddUrl = () => {
    if (!urlInput.trim()) return
    if (urls.length >= maxCount) {
      toast.error(`最大${maxCount}本まで追加できます`)
      return
    }

    // Validate URL
    try {
      new URL(urlInput)
    } catch {
      toast.error('有効なURLを入力してください')
      return
    }

    // Check for duplicates
    if (urls.includes(urlInput.trim())) {
      toast.error('このURLは既に追加されています')
      return
    }

    onUrlsChange([...urls, urlInput.trim()])
    setUrlInput('')
    toast.success('URLを追加しました')
  }

  // Remove URL
  const handleRemoveUrl = (index: number) => {
    const newUrls = urls.filter((_, i) => i !== index)
    onUrlsChange(newUrls)
  }

  // Get URL type label
  const getUrlTypeLabel = (url: string): string => {
    if (url.includes('tiktok.com') || url.includes('vm.tiktok.com')) {
      return 'TikTok'
    }
    if (url.includes('supabase')) {
      return 'アップロード済み'
    }
    return '外部URL'
  }

  const isValidCount = urls.length >= minCount

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={cn(
          'relative border-2 border-dashed rounded-xl p-8 transition-colors cursor-pointer',
          isDragActive
            ? 'border-emerald-500 bg-emerald-500/10'
            : 'border-zinc-700 hover:border-zinc-600',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
            <Upload className="w-8 h-8 text-zinc-400" />
          </div>
          <p className="text-lg font-medium text-white mb-1">
            動画をドラッグ&ドロップ
          </p>
          <p className="text-sm text-zinc-400">
            またはクリックしてファイルを選択
          </p>
          <p className="text-xs text-zinc-500 mt-2">
            MP4, MOV, AVI, WEBM対応（30秒〜1分推奨）
          </p>
        </div>

        {/* Upload Progress */}
        {Object.keys(uploadProgress).length > 0 && (
          <div className="absolute inset-0 bg-zinc-900/80 flex items-center justify-center rounded-xl">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-white">アップロード中...</p>
            </div>
          </div>
        )}
      </div>

      {/* URL Input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
            placeholder="TikTok URL または動画URLを入力..."
            className="pl-10 bg-zinc-900 border-zinc-700"
            disabled={disabled}
          />
        </div>
        <Button
          onClick={handleAddUrl}
          disabled={disabled || !urlInput.trim()}
          variant="secondary"
          className="shrink-0"
        >
          <Plus className="w-4 h-4 mr-1" />
          追加
        </Button>
      </div>

      {/* URL List */}
      {urls.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-400">
              追加済み: {urls.length}本
            </p>
            {!isValidCount && (
              <p className="text-sm text-yellow-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                最低{minCount}本必要です
              </p>
            )}
            {isValidCount && (
              <p className="text-sm text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                準備完了
              </p>
            )}
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2">
            {urls.map((url, index) => (
              <div
                key={`${url}-${index}`}
                className="flex items-center gap-3 p-3 bg-zinc-900 rounded-lg group"
              >
                <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center shrink-0">
                  <Video className="w-5 h-5 text-zinc-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">
                    {url.split('/').pop() || url}
                  </p>
                  <p className="text-xs text-zinc-500">{getUrlTypeLabel(url)}</p>
                </div>
                <Button
                  onClick={() => handleRemoveUrl(index)}
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                  disabled={disabled}
                >
                  <X className="w-4 h-4 text-zinc-400" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {urls.length === 0 && (
        <div className="text-center py-4">
          <p className="text-sm text-zinc-500">
            まだ動画が追加されていません
          </p>
          <p className="text-xs text-zinc-600 mt-1">
            ファイルをアップロードするか、TikTok URLを追加してください
          </p>
        </div>
      )}
    </div>
  )
}
