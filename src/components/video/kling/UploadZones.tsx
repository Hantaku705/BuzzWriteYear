'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, X, Link, Image as ImageIcon, Video, Loader2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { uploadImage, compressImage } from '@/lib/storage/upload'

// ============================================
// ImageUploadZone - フレームタブ用
// ============================================

interface ImageUploadZoneProps {
  label: string
  image: string | null
  onUpload: (url: string | null) => void
  disabled?: boolean
  className?: string
}

export function ImageUploadZone({
  label,
  image,
  onUpload,
  disabled = false,
  className,
}: ImageUploadZoneProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [urlValue, setUrlValue] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = useCallback(
    async (file: File) => {
      setIsUploading(true)
      setUploadProgress(0)

      try {
        let processedFile = file
        if (file.size > 1024 * 1024) {
          setUploadProgress(10)
          processedFile = await compressImage(file)
        }

        setUploadProgress(30)
        const result = await uploadImage(processedFile, 'kling-references')
        setUploadProgress(100)

        onUpload(result.url)
      } catch (error) {
        console.error('Upload failed:', error)
      } finally {
        setIsUploading(false)
        setUploadProgress(0)
      }
    },
    [onUpload]
  )

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      handleFileUpload(file)
    }
  }

  const handleUrlSubmit = () => {
    if (urlValue.trim()) {
      try {
        new URL(urlValue)
        onUpload(urlValue.trim())
        setUrlValue('')
        setShowUrlInput(false)
      } catch {
        // Invalid URL
      }
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      <Label>{label}</Label>

      {image ? (
        // 画像プレビュー
        <div className="relative aspect-video rounded-lg overflow-hidden border border-zinc-700 bg-zinc-800">
          <img src={image} alt={label} className="w-full h-full object-cover" />
          {!disabled && (
            <button
              onClick={() => onUpload(null)}
              className="absolute top-2 right-2 p-1 rounded-full bg-black/60 hover:bg-red-500/60 transition-colors"
            >
              <X className="h-4 w-4 text-white" />
            </button>
          )}
        </div>
      ) : (
        // アップロードゾーン
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className={cn(
            'relative aspect-video rounded-lg border-2 border-dashed border-zinc-700',
            'bg-zinc-800/50 flex flex-col items-center justify-center gap-2',
            'cursor-pointer hover:bg-zinc-800 hover:border-zinc-600 transition-all',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-pink-400" />
              <Progress value={uploadProgress} className="w-1/2" />
            </>
          ) : (
            <>
              <ImageIcon className="h-8 w-8 text-zinc-500" />
              <span className="text-sm text-zinc-400">クリックまたはドロップ</span>
            </>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileUpload(file)
              e.target.value = ''
            }}
            className="hidden"
            disabled={disabled}
          />
        </div>
      )}

      {/* URL入力 */}
      {!image && !isUploading && (
        <div className="flex items-center gap-2">
          {showUrlInput ? (
            <>
              <Input
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                placeholder="https://..."
                className="bg-zinc-800 border-zinc-700 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
              />
              <Button size="sm" onClick={handleUrlSubmit}>
                追加
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowUrlInput(false)}>
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <button
              onClick={() => setShowUrlInput(true)}
              disabled={disabled}
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300"
            >
              <Link className="h-3 w-3" />
              URL入力
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================
// FrameUploadZones - フレームタブ専用（スタート&エンド）
// ============================================

interface FrameUploadZonesProps {
  startFrame: string | null
  endFrame: string | null
  onStartFrameChange: (url: string | null) => void
  onEndFrameChange: (url: string | null) => void
  disabled?: boolean
}

export function FrameUploadZones({
  startFrame,
  endFrame,
  onStartFrameChange,
  onEndFrameChange,
  disabled = false,
}: FrameUploadZonesProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 items-start">
        <ImageUploadZone
          label="スタート画像"
          image={startFrame}
          onUpload={onStartFrameChange}
          disabled={disabled}
        />

        <div className="flex items-center justify-center h-full">
          <ArrowRight className="h-6 w-6 text-zinc-500 mt-8" />
        </div>

        <ImageUploadZone
          label="エンド画像"
          image={endFrame}
          onUpload={onEndFrameChange}
          disabled={disabled}
          className="col-start-2"
        />
      </div>

      <p className="text-xs text-zinc-500 text-center">
        スタートからエンドへの変化をAIが自然に補間します
      </p>
    </div>
  )
}

// ============================================
// VideoUploadZone - プロンプト変換/動画参考タブ用
// ============================================

interface VideoUploadZoneProps {
  label?: string
  video: string | null
  onUpload: (url: string | null) => void
  disabled?: boolean
  className?: string
}

export function VideoUploadZone({
  label = '動画',
  video,
  onUpload,
  disabled = false,
  className,
}: VideoUploadZoneProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [urlValue, setUrlValue] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = useCallback(
    async (file: File) => {
      setIsUploading(true)
      setUploadProgress(0)

      try {
        setUploadProgress(30)
        const result = await uploadImage(file, 'kling-references')
        setUploadProgress(100)

        onUpload(result.url)
      } catch (error) {
        console.error('Upload failed:', error)
      } finally {
        setIsUploading(false)
        setUploadProgress(0)
      }
    },
    [onUpload]
  )

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('video/')) {
      handleFileUpload(file)
    }
  }

  const handleUrlSubmit = () => {
    if (urlValue.trim()) {
      try {
        new URL(urlValue)
        onUpload(urlValue.trim())
        setUrlValue('')
        setShowUrlInput(false)
      } catch {
        // Invalid URL
      }
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      <Label>{label}</Label>

      {video ? (
        // 動画プレビュー
        <div className="relative aspect-video rounded-lg overflow-hidden border border-purple-500/50 bg-zinc-800">
          <video
            src={video}
            className="w-full h-full object-cover"
            controls
            muted
            loop
            playsInline
          />
          {!disabled && (
            <button
              onClick={() => onUpload(null)}
              className="absolute top-2 right-2 p-1 rounded-full bg-black/60 hover:bg-red-500/60 transition-colors"
            >
              <X className="h-4 w-4 text-white" />
            </button>
          )}
        </div>
      ) : (
        // アップロードゾーン
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className={cn(
            'relative aspect-video rounded-lg border-2 border-dashed border-purple-500/50',
            'bg-purple-500/5 flex flex-col items-center justify-center gap-2',
            'cursor-pointer hover:bg-purple-500/10 hover:border-purple-500/70 transition-all',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
              <Progress value={uploadProgress} className="w-1/2" />
            </>
          ) : (
            <>
              <Video className="h-8 w-8 text-purple-400" />
              <span className="text-sm text-purple-300">動画をアップロード</span>
              <span className="text-xs text-zinc-500">クリックまたはドロップ</span>
            </>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileUpload(file)
              e.target.value = ''
            }}
            className="hidden"
            disabled={disabled}
          />
        </div>
      )}

      {/* URL入力 */}
      {!video && !isUploading && (
        <div className="flex items-center gap-2">
          {showUrlInput ? (
            <>
              <Input
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                placeholder="https://..."
                className="bg-zinc-800 border-zinc-700 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
              />
              <Button size="sm" onClick={handleUrlSubmit}>
                追加
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowUrlInput(false)}>
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <button
              onClick={() => setShowUrlInput(true)}
              disabled={disabled}
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300"
            >
              <Link className="h-3 w-3" />
              URL入力
            </button>
          )}
        </div>
      )}
    </div>
  )
}
