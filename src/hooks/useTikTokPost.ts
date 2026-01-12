import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { postToTikTok, getPostStatus } from '@/lib/api/tiktok'
import type { PostToTikTokRequest } from '@/types/tiktok'

export const tiktokPostKeys = {
  all: ['tiktok-posts'] as const,
  status: (postId: string) => ['tiktok-post-status', postId] as const,
}

// TikTokに投稿
export function usePostToTikTok() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: PostToTikTokRequest) => postToTikTok(params),
    onSuccess: () => {
      // 動画一覧を再取得
      queryClient.invalidateQueries({ queryKey: ['videos'] })
    },
  })
}

// 投稿ステータス取得（ポーリング対応）
export function usePostStatus(postId: string | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: tiktokPostKeys.status(postId ?? ''),
    queryFn: () => getPostStatus(postId!),
    enabled: !!postId && (options?.enabled !== false),
    refetchInterval: (query) => {
      const data = query.state.data
      // 完了または失敗したらポーリング停止
      if (data?.status === 'completed' || data?.status === 'failed') {
        return false
      }
      return 3000 // 3秒ごとにポーリング
    },
  })
}
