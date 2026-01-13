'use client'

import { useMemo } from 'react'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'

interface VideoPerformance {
  id: string
  title: string
  templateType: string
  postedAt: string
  views: number
  likes: number
  comments: number
  shares: number
  engagementRate: number
  trend: 'up' | 'down' | 'stable'
}

interface ConversionTableProps {
  data: VideoPerformance[]
  sortBy?: keyof VideoPerformance
  sortOrder?: 'asc' | 'desc'
  onSort?: (field: keyof VideoPerformance) => void
}

const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
  switch (trend) {
    case 'up':
      return <TrendingUp className="h-4 w-4 text-green-500" />
    case 'down':
      return <TrendingDown className="h-4 w-4 text-red-500" />
    default:
      return <Minus className="h-4 w-4 text-zinc-500" />
  }
}

export function ConversionTable({
  data,
  sortBy = 'views',
  sortOrder = 'desc',
  onSort,
}: ConversionTableProps) {
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const aValue = a[sortBy]
      const bValue = b[sortBy]
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue
      }
      return 0
    })
  }, [data, sortBy, sortOrder])

  const formatNumber = (num: number) => num.toLocaleString()
  const formatPercent = (num: number) => `${(num * 100).toFixed(2)}%`

  // Sort indicator component
  const SortIndicator = ({ field }: { field: keyof VideoPerformance }) => {
    if (sortBy !== field) return null
    return sortOrder === 'asc' ? (
      <ChevronUp className="h-3 w-3 text-pink-500" />
    ) : (
      <ChevronDown className="h-3 w-3 text-pink-500" />
    )
  }

  // Get header class based on sort state
  const getHeaderClass = (field: keyof VideoPerformance) => {
    const baseClass = "text-right py-3 px-2 font-medium cursor-pointer transition-colors"
    if (sortBy === field) {
      return `${baseClass} text-pink-400 bg-pink-500/10`
    }
    return `${baseClass} text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50`
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-700">
            <th className="text-left py-3 px-4 font-medium text-zinc-400">
              動画
            </th>
            <th className="text-left py-3 px-2 font-medium text-zinc-400">
              テンプレート
            </th>
            <th
              className={getHeaderClass('views')}
              onClick={() => onSort?.('views')}
            >
              <div className="flex items-center justify-end gap-1">
                <Eye className="h-3 w-3" />
                再生数
                <SortIndicator field="views" />
              </div>
            </th>
            <th
              className={getHeaderClass('likes')}
              onClick={() => onSort?.('likes')}
            >
              <div className="flex items-center justify-end gap-1">
                <Heart className="h-3 w-3" />
                いいね
                <SortIndicator field="likes" />
              </div>
            </th>
            <th
              className={getHeaderClass('comments')}
              onClick={() => onSort?.('comments')}
            >
              <div className="flex items-center justify-end gap-1">
                <MessageCircle className="h-3 w-3" />
                コメント
                <SortIndicator field="comments" />
              </div>
            </th>
            <th
              className={getHeaderClass('shares')}
              onClick={() => onSort?.('shares')}
            >
              <div className="flex items-center justify-end gap-1">
                <Share2 className="h-3 w-3" />
                シェア
                <SortIndicator field="shares" />
              </div>
            </th>
            <th
              className={getHeaderClass('engagementRate')}
              onClick={() => onSort?.('engagementRate')}
            >
              <div className="flex items-center justify-end gap-1">
                エンゲージ率
                <SortIndicator field="engagementRate" />
              </div>
            </th>
            <th className="text-center py-3 px-2 font-medium text-zinc-400">
              傾向
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedData.map((video) => (
            <tr
              key={video.id}
              className="border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors"
            >
              <td className="py-3 px-4">
                <div className="font-medium text-zinc-100 truncate max-w-[200px]">
                  {video.title}
                </div>
                <div className="text-xs text-zinc-500">{video.postedAt}</div>
              </td>
              <td className="py-3 px-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-zinc-700 text-zinc-300">
                  {video.templateType}
                </span>
              </td>
              <td className="text-right py-3 px-2 font-medium text-purple-400">
                {formatNumber(video.views)}
              </td>
              <td className="text-right py-3 px-2 text-pink-400">
                {formatNumber(video.likes)}
              </td>
              <td className="text-right py-3 px-2 text-zinc-300">
                {formatNumber(video.comments)}
              </td>
              <td className="text-right py-3 px-2 text-green-400">
                {formatNumber(video.shares)}
              </td>
              <td className="text-right py-3 px-2 text-zinc-300">
                {formatPercent(video.engagementRate)}
              </td>
              <td className="text-center py-3 px-2">
                <TrendIcon trend={video.trend} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {sortedData.length === 0 && (
        <div className="text-center py-8 text-zinc-500">
          データがありません
        </div>
      )}
    </div>
  )
}

// サマリーカード
export function PerformanceSummary({
  totalViews,
  totalLikes,
  totalComments,
  totalShares,
  avgEngagementRate,
}: {
  totalViews: number
  totalLikes: number
  totalComments: number
  totalShares: number
  avgEngagementRate: number
}) {
  const totalEngagement = totalLikes + totalComments + totalShares

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-zinc-800 rounded-lg p-4">
        <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
          <Eye className="h-4 w-4" />
          総再生数
        </div>
        <div className="text-2xl font-bold text-purple-400">
          {totalViews.toLocaleString()}
        </div>
      </div>

      <div className="bg-zinc-800 rounded-lg p-4">
        <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
          <Heart className="h-4 w-4" />
          総いいね
        </div>
        <div className="text-2xl font-bold text-pink-400">
          {totalLikes.toLocaleString()}
        </div>
      </div>

      <div className="bg-zinc-800 rounded-lg p-4">
        <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
          <Share2 className="h-4 w-4" />
          総エンゲージメント
        </div>
        <div className="text-2xl font-bold text-green-400">
          {totalEngagement.toLocaleString()}
        </div>
      </div>

      <div className="bg-zinc-800 rounded-lg p-4">
        <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
          <TrendingUp className="h-4 w-4" />
          エンゲージメント率
        </div>
        <div className="text-2xl font-bold text-orange-400">
          {(avgEngagementRate * 100).toFixed(2)}%
        </div>
      </div>
    </div>
  )
}
