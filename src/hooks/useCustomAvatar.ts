'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// ============================================
// 型定義
// ============================================

export interface CustomAvatar {
  avatarId: string
  name: string
  type: 'photo' | 'video'
  status: 'processing' | 'completed' | 'failed'
  previewImageUrl?: string
  previewVideoUrl?: string
  createdAt: string
}

export interface PhotoAvatarRequest {
  imageUrl: string
  name: string
  gender?: 'male' | 'female'
}

export interface VideoAvatarRequest {
  trainingVideoUrl: string
  consentVideoUrl: string
  name: string
}

interface PhotoAvatarResponse {
  success: boolean
  avatar: {
    avatarId: string
    name: string
    type: 'photo'
    status: string
    previewUrl?: string
  }
  message: string
}

interface VideoAvatarResponse {
  success: boolean
  avatar: {
    avatarId: string
    trainingId: string
    name: string
    type: 'video'
    status: string
    estimatedTime?: number
  }
  message: string
}

interface AvatarStatus {
  avatarId?: string
  trainingId?: string
  name?: string
  status: 'processing' | 'queued' | 'training' | 'completed' | 'failed'
  progress?: number
  previewUrl?: string
  estimatedTimeMinutes?: number
  error?: string
}

// ============================================
// API関数
// ============================================

async function listCustomAvatars(): Promise<CustomAvatar[]> {
  const response = await fetch('/api/videos/heygen/avatar')

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || 'Failed to list custom avatars')
  }

  const data = await response.json()
  return data.avatars
}

async function createPhotoAvatar(params: PhotoAvatarRequest): Promise<PhotoAvatarResponse> {
  const response = await fetch('/api/videos/heygen/avatar', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'photo',
      imageUrl: params.imageUrl,
      name: params.name,
      gender: params.gender,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || 'Failed to create photo avatar')
  }

  return response.json()
}

async function createVideoAvatar(params: VideoAvatarRequest): Promise<VideoAvatarResponse> {
  const response = await fetch('/api/videos/heygen/avatar', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'video',
      trainingVideoUrl: params.trainingVideoUrl,
      consentVideoUrl: params.consentVideoUrl,
      name: params.name,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || 'Failed to create video avatar')
  }

  return response.json()
}

async function getAvatarStatus(
  avatarId: string,
  type: 'photo' | 'video',
  trainingId?: string
): Promise<AvatarStatus> {
  const params = new URLSearchParams({ type })
  if (trainingId) {
    params.set('trainingId', trainingId)
  }

  const response = await fetch(`/api/videos/heygen/avatar/${avatarId}/status?${params}`)

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || 'Failed to get avatar status')
  }

  const data = await response.json()
  return data.status
}

// ============================================
// Hooks
// ============================================

/**
 * カスタムアバター一覧を取得
 */
export function useCustomAvatars() {
  return useQuery<CustomAvatar[]>({
    queryKey: ['customAvatars'],
    queryFn: listCustomAvatars,
  })
}

/**
 * Photo Avatar作成
 */
export function useCreatePhotoAvatar() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createPhotoAvatar,
    onSuccess: () => {
      // アバター一覧を再取得
      queryClient.invalidateQueries({ queryKey: ['customAvatars'] })
    },
  })
}

/**
 * Video Avatar作成
 */
export function useCreateVideoAvatar() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createVideoAvatar,
    onSuccess: () => {
      // アバター一覧を再取得
      queryClient.invalidateQueries({ queryKey: ['customAvatars'] })
    },
  })
}

interface UseAvatarStatusOptions {
  enabled?: boolean
  pollInterval?: number
}

/**
 * Photo Avatar ステータスポーリング
 */
export function usePhotoAvatarStatus(
  avatarId: string | null,
  options: UseAvatarStatusOptions = {}
) {
  const { enabled = true, pollInterval = 5000 } = options
  const queryClient = useQueryClient()

  return useQuery<AvatarStatus>({
    queryKey: ['avatarStatus', 'photo', avatarId],
    queryFn: () => {
      if (!avatarId) throw new Error('Avatar ID is required')
      return getAvatarStatus(avatarId, 'photo')
    },
    enabled: enabled && !!avatarId,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === 'processing') {
        return pollInterval
      }
      // 完了したらアバター一覧を更新
      if (status === 'completed' || status === 'failed') {
        queryClient.invalidateQueries({ queryKey: ['customAvatars'] })
      }
      return false
    },
    refetchIntervalInBackground: false,
  })
}

/**
 * Video Avatar トレーニングステータスポーリング
 */
export function useVideoAvatarStatus(
  avatarId: string | null,
  trainingId: string | null,
  options: UseAvatarStatusOptions = {}
) {
  const { enabled = true, pollInterval = 30000 } = options // 30秒間隔（長時間トレーニング）
  const queryClient = useQueryClient()

  return useQuery<AvatarStatus>({
    queryKey: ['avatarStatus', 'video', avatarId, trainingId],
    queryFn: () => {
      if (!avatarId || !trainingId) throw new Error('Avatar ID and Training ID are required')
      return getAvatarStatus(avatarId, 'video', trainingId)
    },
    enabled: enabled && !!avatarId && !!trainingId,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === 'queued' || status === 'training') {
        return pollInterval
      }
      // 完了したらアバター一覧を更新
      if (status === 'completed' || status === 'failed') {
        queryClient.invalidateQueries({ queryKey: ['customAvatars'] })
      }
      return false
    },
    refetchIntervalInBackground: false,
  })
}
