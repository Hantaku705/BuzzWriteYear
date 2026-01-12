'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

// 型定義
export interface HeyGenGenerateRequest {
  avatarId: string
  script: string
  voiceId?: string
  backgroundUrl?: string
  title?: string
  productId?: string
}

export interface HeyGenGenerateResponse {
  video: {
    id: string
  }
  jobId: string
  status: 'queued'
}

// API関数
async function generateHeyGenVideo(params: HeyGenGenerateRequest): Promise<HeyGenGenerateResponse> {
  const response = await fetch('/api/videos/heygen', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || 'Failed to start HeyGen video generation')
  }

  return response.json()
}

// Hook
export function useHeygenGenerate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: generateHeyGenVideo,
    onSuccess: () => {
      // 動画一覧を再取得
      queryClient.invalidateQueries({ queryKey: ['videos'] })
    },
  })
}
