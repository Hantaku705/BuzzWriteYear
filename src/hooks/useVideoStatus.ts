/**
 * 動画生成進捗ポーリングフック
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface VideoStatus {
  id: string
  status: string
  progress: number
  message: string
  remoteUrl?: string
}

interface UseVideoStatusOptions {
  enabled?: boolean
  pollInterval?: number
}

export function useVideoStatus(
  videoId: string | null,
  options: UseVideoStatusOptions = {}
) {
  const { enabled = true, pollInterval = 2000 } = options

  return useQuery<VideoStatus>({
    queryKey: ['videoStatus', videoId],
    queryFn: async () => {
      if (!videoId) throw new Error('Video ID is required')

      const response = await fetch(`/api/videos/${videoId}/status`)
      if (!response.ok) {
        throw new Error('Failed to fetch video status')
      }
      return response.json()
    },
    enabled: enabled && !!videoId,
    refetchInterval: (query) => {
      // 生成中の場合のみポーリング
      const status = query.state.data?.status
      if (status === 'generating') {
        return pollInterval
      }
      return false
    },
    refetchIntervalInBackground: false,
  })
}

export function useCancelVideo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (videoId: string) => {
      const response = await fetch(`/api/videos/${videoId}/cancel`, {
        method: 'POST',
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to cancel video')
      }
      return response.json()
    },
    onSuccess: (_, videoId) => {
      // ステータスキャッシュを更新
      queryClient.invalidateQueries({ queryKey: ['videoStatus', videoId] })
      // 動画一覧も更新
      queryClient.invalidateQueries({ queryKey: ['videos'] })
    },
  })
}
