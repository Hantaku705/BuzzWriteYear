/**
 * TikTok API クライアントサイド関数
 */

import type {
  TikTokAccountResponse,
  PostToTikTokRequest,
  PostToTikTokResponse,
  PostStatusResponse,
} from '@/types/tiktok'

// アカウント一覧取得
export async function getTikTokAccounts(): Promise<TikTokAccountResponse[]> {
  const response = await fetch('/api/tiktok/accounts', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch TikTok accounts')
  }

  const data = await response.json()
  return data.accounts
}

// アカウント連携解除
export async function disconnectTikTokAccount(accountId: string): Promise<void> {
  const response = await fetch(`/api/tiktok/accounts?accountId=${accountId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to disconnect TikTok account')
  }
}

// TikTokに投稿
export async function postToTikTok(
  params: PostToTikTokRequest
): Promise<PostToTikTokResponse> {
  const response = await fetch('/api/tiktok/post', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to post to TikTok')
  }

  return response.json()
}

// 投稿ステータス取得
export async function getPostStatus(postId: string): Promise<PostStatusResponse> {
  const response = await fetch(`/api/tiktok/post/${postId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to get post status')
  }

  return response.json()
}
