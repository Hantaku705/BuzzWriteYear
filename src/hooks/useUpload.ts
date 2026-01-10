'use client'

import { useState } from 'react'
import { uploadImage, compressImage, type UploadResult } from '@/lib/storage/upload'

export function useUpload() {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const upload = async (file: File): Promise<UploadResult | null> => {
    setUploading(true)
    setProgress(0)
    setError(null)

    try {
      setProgress(20)

      // Compress image if it's too large
      let processedFile = file
      if (file.size > 1024 * 1024) {
        processedFile = await compressImage(file)
        setProgress(50)
      } else {
        setProgress(50)
      }

      const result = await uploadImage(processedFile)
      setProgress(100)
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      setError(message)
      return null
    } finally {
      setUploading(false)
    }
  }

  return {
    upload,
    uploading,
    progress,
    error,
    clearError: () => setError(null),
  }
}
