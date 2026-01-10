'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getVideos,
  getVideosByStatus,
  getVideo,
  createVideo,
  updateVideoStatus,
  deleteVideo,
} from '@/lib/api/videos'
import type { VideoInsert } from '@/types/database'

export const videoKeys = {
  all: ['videos'] as const,
  byStatus: (status: string) => ['videos', 'status', status] as const,
  detail: (id: string) => ['videos', id] as const,
}

export function useVideos() {
  return useQuery({
    queryKey: videoKeys.all,
    queryFn: getVideos,
  })
}

export function useVideosByStatus(status: string) {
  return useQuery({
    queryKey: videoKeys.byStatus(status),
    queryFn: () => getVideosByStatus(status),
    enabled: !!status,
  })
}

export function useVideo(id: string) {
  return useQuery({
    queryKey: videoKeys.detail(id),
    queryFn: () => getVideo(id),
    enabled: !!id,
  })
}

export function useCreateVideo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (video: Omit<VideoInsert, 'user_id'>) => createVideo(video),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: videoKeys.all })
    },
  })
}

export function useUpdateVideoStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateVideoStatus(id, status),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: videoKeys.all })
      queryClient.invalidateQueries({ queryKey: videoKeys.detail(data.id) })
    },
  })
}

export function useDeleteVideo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteVideo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: videoKeys.all })
    },
  })
}
