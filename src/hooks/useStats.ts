'use client'

import { useQuery } from '@tanstack/react-query'
import {
  getDashboardStats,
  getRecentVideos,
  getTopProducts,
} from '@/lib/api/stats'

export const statsKeys = {
  dashboard: ['stats', 'dashboard'] as const,
  recentVideos: ['stats', 'recentVideos'] as const,
  topProducts: ['stats', 'topProducts'] as const,
}

export function useDashboardStats() {
  return useQuery({
    queryKey: statsKeys.dashboard,
    queryFn: getDashboardStats,
    staleTime: 30 * 1000, // 30 seconds
  })
}

export function useRecentVideos(limit: number = 5) {
  return useQuery({
    queryKey: [...statsKeys.recentVideos, limit],
    queryFn: () => getRecentVideos(limit),
  })
}

export function useTopProducts(limit: number = 5) {
  return useQuery({
    queryKey: [...statsKeys.topProducts, limit],
    queryFn: () => getTopProducts(limit),
  })
}
