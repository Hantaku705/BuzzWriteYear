'use client'

import { useQuery } from '@tanstack/react-query'

// 型定義
export interface HeyGenAvatar {
  avatar_id: string
  avatar_name: string
  preview_image_url: string
  preview_video_url: string
}

export interface HeyGenVoice {
  voice_id: string
  name: string
  language: string
  gender: string
  preview_audio: string
}

interface HeyGenAssetsResponse {
  avatars?: HeyGenAvatar[]
  voices?: HeyGenVoice[]
}

// API関数
async function fetchHeyGenAssets(type?: 'avatars' | 'voices'): Promise<HeyGenAssetsResponse> {
  const url = type
    ? `/api/videos/heygen?type=${type}`
    : '/api/videos/heygen'

  const response = await fetch(url)

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || 'Failed to fetch HeyGen assets')
  }

  return response.json()
}

// Query Keys
export const heygenAssetsKeys = {
  all: ['heygen-assets'] as const,
  avatars: ['heygen-assets', 'avatars'] as const,
  voices: ['heygen-assets', 'voices'] as const,
}

// Hooks
export function useHeygenAvatars() {
  return useQuery({
    queryKey: heygenAssetsKeys.avatars,
    queryFn: () => fetchHeyGenAssets('avatars').then((data) => data.avatars || []),
    staleTime: 1000 * 60 * 30, // 30分キャッシュ
  })
}

export function useHeygenVoices() {
  return useQuery({
    queryKey: heygenAssetsKeys.voices,
    queryFn: () => fetchHeyGenAssets('voices').then((data) => data.voices || []),
    staleTime: 1000 * 60 * 30, // 30分キャッシュ
  })
}

export function useHeygenAssets() {
  return useQuery({
    queryKey: heygenAssetsKeys.all,
    queryFn: () => fetchHeyGenAssets(),
    staleTime: 1000 * 60 * 30, // 30分キャッシュ
  })
}
