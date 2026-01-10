'use client'

import { useMemo } from 'react'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  Heart,
  ShoppingCart,
  DollarSign,
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
  clicks: number
  orders: number
  gmv: number
  conversionRate: number
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
  sortBy = 'gmv',
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
  const formatCurrency = (num: number) => `¥${num.toLocaleString()}`
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
                視聴
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
              className={getHeaderClass('clicks')}
              onClick={() => onSort?.('clicks')}
            >
              <div className="flex items-center justify-end gap-1">
                <ShoppingCart className="h-3 w-3" />
                クリック
                <SortIndicator field="clicks" />
              </div>
            </th>
            <th
              className={getHeaderClass('orders')}
              onClick={() => onSort?.('orders')}
            >
              <div className="flex items-center justify-end gap-1">
                注文
                <SortIndicator field="orders" />
              </div>
            </th>
            <th
              className={getHeaderClass('gmv')}
              onClick={() => onSort?.('gmv')}
            >
              <div className="flex items-center justify-end gap-1">
                <DollarSign className="h-3 w-3" />
                GMV
                <SortIndicator field="gmv" />
              </div>
            </th>
            <th
              className={getHeaderClass('conversionRate')}
              onClick={() => onSort?.('conversionRate')}
            >
              <div className="flex items-center justify-end gap-1">
                CVR
                <SortIndicator field="conversionRate" />
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
              <td className="text-right py-3 px-2 text-zinc-300">
                {formatNumber(video.views)}
              </td>
              <td className="text-right py-3 px-2 text-zinc-300">
                {formatNumber(video.likes)}
              </td>
              <td className="text-right py-3 px-2 text-zinc-300">
                {formatNumber(video.clicks)}
              </td>
              <td className="text-right py-3 px-2 text-zinc-300">
                {formatNumber(video.orders)}
              </td>
              <td className="text-right py-3 px-2 font-medium text-green-400">
                {formatCurrency(video.gmv)}
              </td>
              <td className="text-right py-3 px-2 text-zinc-300">
                {formatPercent(video.conversionRate)}
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
  totalGmv,
  totalOrders,
  totalViews,
  avgConversionRate,
  gmvChange,
}: {
  totalGmv: number
  totalOrders: number
  totalViews: number
  avgConversionRate: number
  gmvChange?: number
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-zinc-800 rounded-lg p-4">
        <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
          <DollarSign className="h-4 w-4" />
          総GMV
        </div>
        <div className="text-2xl font-bold text-green-400">
          ¥{totalGmv.toLocaleString()}
        </div>
        {gmvChange !== undefined && (
          <div
            className={`text-xs mt-1 ${
              gmvChange >= 0 ? 'text-green-500' : 'text-red-500'
            }`}
          >
            {gmvChange >= 0 ? '+' : ''}
            {(gmvChange * 100).toFixed(1)}% vs 前週
          </div>
        )}
      </div>

      <div className="bg-zinc-800 rounded-lg p-4">
        <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
          <ShoppingCart className="h-4 w-4" />
          総注文数
        </div>
        <div className="text-2xl font-bold text-blue-400">
          {totalOrders.toLocaleString()}
        </div>
      </div>

      <div className="bg-zinc-800 rounded-lg p-4">
        <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
          <Eye className="h-4 w-4" />
          総視聴数
        </div>
        <div className="text-2xl font-bold text-purple-400">
          {totalViews.toLocaleString()}
        </div>
      </div>

      <div className="bg-zinc-800 rounded-lg p-4">
        <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
          <TrendingUp className="h-4 w-4" />
          平均CVR
        </div>
        <div className="text-2xl font-bold text-orange-400">
          {(avgConversionRate * 100).toFixed(2)}%
        </div>
      </div>
    </div>
  )
}
