import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTikTokAccounts, disconnectTikTokAccount } from '@/lib/api/tiktok'

export const tiktokAccountKeys = {
  all: ['tiktok-accounts'] as const,
}

// TikTokアカウント一覧取得
export function useTikTokAccounts() {
  return useQuery({
    queryKey: tiktokAccountKeys.all,
    queryFn: getTikTokAccounts,
    staleTime: 1000 * 60 * 5, // 5分間キャッシュ
  })
}

// TikTokアカウント連携解除
export function useDisconnectTikTokAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: disconnectTikTokAccount,
    onSuccess: () => {
      // アカウント一覧を再取得
      queryClient.invalidateQueries({ queryKey: tiktokAccountKeys.all })
    },
  })
}
