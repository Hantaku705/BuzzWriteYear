import { useMutation, useQueryClient } from '@tanstack/react-query'

export interface KlingGenerateParams {
  productId: string
  mode: 'image-to-video' | 'text-to-video'
  imageUrl?: string
  prompt: string
  negativePrompt?: string
  duration: 5 | 10
  presetId?: string
  title: string
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
