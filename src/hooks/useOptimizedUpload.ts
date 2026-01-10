'use client'

import { useState } from 'react'
import { useAuth } from './useAuth'

export interface OptimizedImage {
  url: string
  path: string
  format: string
  width: number
  height: number
  size: number
}

export interface ImageThumbnails {
  sm?: { url: string; width: number; height: number }
  md?: { url: string; width: number; height: number }
  lg?: { url: string; width: number; height: number }
  xl?: { url: string; width: number; height: number }
}

export interface UploadResult {
  image: OptimizedImage
  thumbnails: ImageThumbnails
  original: {
    width: number
    height: number
    format: string
    size: number
  }
  compression: {
    ratio: number
    savedBytes: number
  }
}

export interface UseOptimizedUploadOptions {
  generateThumbnails?: boolean
  format?: 'webp' | 'jpeg' | 'png'
  quality?: number
  maxWidth?: number
}

export function useOptimizedUpload(options: UseOptimizedUploadOptions = {}) {
  const { user } = useAuth()
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const upload = async (file: File): Promise<UploadResult | null> => {
    if (!user) {
      setError('ログインが必要です')
      return null
    }

    setIsUploading(true)
    setProgress(0)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('userId', user.id)
      formData.append('thumbnails', options.generateThumbnails ? 'true' : 'false')
      formData.append('format', options.format || 'webp')
      formData.append('quality', String(options.quality || 85))
      formData.append('maxWidth', String(options.maxWidth || 1200))

      setProgress(30)

      const response = await fetch('/api/images/optimize', {
        method: 'POST',
        body: formData,
      })

      setProgress(70)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'アップロードに失敗しました')
      }

      const result = await response.json()
      setProgress(100)

      return result as UploadResult
    } catch (err) {
      const message = err instanceof Error ? err.message : 'アップロードに失敗しました'
      setError(message)
      return null
    } finally {
      setIsUploading(false)
    }
  }

  return {
    upload,
    isUploading,
    progress,
    error,
    clearError: () => setError(null),
  }
}
