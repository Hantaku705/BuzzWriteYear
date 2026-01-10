'use client'

import { useQuery } from '@tanstack/react-query'
import {
  getAnalyticsSummary,
  getGMVData,
  getVideoPerformance,
  getTemplatePerformance,
} from '@/lib/api/analytics'

export const analyticsKeys = {
  summary: ['analytics', 'summary'] as const,
  gmvData: (days: number) => ['analytics', 'gmv', days] as const,
  videoPerformance: ['analytics', 'videos'] as const,
  templatePerformance: ['analytics', 'templates'] as const,
}

export function useAnalyticsSummary() {
  return useQuery({
    queryKey: analyticsKeys.summary,
    queryFn: getAnalyticsSummary,
    staleTime: 60 * 1000, // 1 minute
  })
}

export function useGMVData(days: number = 30) {
  return useQuery({
    queryKey: analyticsKeys.gmvData(days),
    queryFn: () => getGMVData(days),
    staleTime: 60 * 1000,
  })
}

export function useVideoPerformance() {
  return useQuery({
    queryKey: analyticsKeys.videoPerformance,
    queryFn: getVideoPerformance,
    staleTime: 60 * 1000,
  })
}

export function useTemplatePerformance() {
  return useQuery({
    queryKey: analyticsKeys.templatePerformance,
    queryFn: getTemplatePerformance,
    staleTime: 60 * 1000,
  })
}
