import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { KlingModelVersion, KlingAspectRatio, KlingQuality } from '@/types/database'

export interface KlingGenerateParams {
  productId: string
  mode: 'image-to-video' | 'text-to-video'
  imageUrl?: string
  imageTailUrl?: string           // O1デュアルキーフレーム（終了フレーム）
  prompt: string
  negativePrompt?: string
  duration: 5 | 10
  presetId?: string
  title: string
  // O1新パラメータ
  modelVersion?: KlingModelVersion
  aspectRatio?: KlingAspectRatio
  quality?: KlingQuality
  cfgScale?: number
  enableAudio?: boolean           // 2.6のみ
}

interface KlingGenerateResponse {
  success: boolean
  video: {
    id: string
    title: string
    status: string
  }
  jobId: string
  message: string
}

async function generateKlingVideo(params: KlingGenerateParams): Promise<KlingGenerateResponse> {
  const response = await fetch('/api/videos/kling', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...params,
      duration: String(params.duration),
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to generate video')
  }

  return response.json()
}

export function useKlingGenerate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: generateKlingVideo,
    onSuccess: () => {
      // 動画一覧を再取得
      queryClient.invalidateQueries({ queryKey: ['videos'] })
    },
  })
}
