'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'
import {
  Video,
  MoreHorizontal,
  Download,
  Trash2,
  Edit,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { UGCStyle } from '@/types/ugc-style'

interface UGCStyleCardProps {
  style: UGCStyle
  onExport?: (id: string) => void
  onDelete?: (id: string) => void
}

const statusConfig = {
  analyzing: {
    icon: Loader2,
    label: '分析中',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10',
    animate: true,
  },
  ready: {
    icon: CheckCircle2,
    label: '準備完了',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-400/10',
    animate: false,
  },
  failed: {
    icon: AlertCircle,
    label: 'エラー',
    color: 'text-red-400',
    bgColor: 'bg-red-400/10',
    animate: false,
  },
}

export function UGCStyleCard({ style, onExport, onDelete }: UGCStyleCardProps) {
  const status = statusConfig[style.status]
  const StatusIcon = status.icon

  return (
    <div className="group relative bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-colors">
      {/* Thumbnail / Placeholder */}
      <Link href={`/generate/ugc-styles/${style.id}`} className="block">
        <div className="aspect-video bg-zinc-800 relative">
          {style.thumbnail_url ? (
            <img
              src={style.thumbnail_url}
              alt={style.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Video className="w-12 h-12 text-zinc-600" />
            </div>
          )}

          {/* Status Badge */}
          <div
            className={cn(
              'absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-full',
              status.bgColor
            )}
          >
            <StatusIcon
              className={cn('w-3.5 h-3.5', status.color, status.animate && 'animate-spin')}
            />
            <span className={cn('text-xs font-medium', status.color)}>
              {status.label}
            </span>
          </div>

          {/* Sample Count */}
          <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg">
            <span className="text-xs text-white">{style.sample_count}本のサンプル</span>
          </div>
        </div>
      </Link>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <Link href={`/generate/ugc-styles/${style.id}`}>
              <h3 className="font-semibold text-white truncate hover:text-emerald-400 transition-colors">
                {style.name}
              </h3>
            </Link>
            {style.description && (
              <p className="text-sm text-zinc-400 mt-1 line-clamp-2">
                {style.description}
              </p>
            )}
          </div>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link href={`/generate/ugc-styles/${style.id}`}>
                  <Edit className="mr-2 h-4 w-4" />
                  詳細を見る
                </Link>
              </DropdownMenuItem>
              {style.status === 'ready' && onExport && (
                <DropdownMenuItem onClick={() => onExport(style.id)}>
                  <Download className="mr-2 h-4 w-4" />
                  JSONエクスポート
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(style.id)}
                  className="text-red-400 focus:text-red-400"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  削除
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Keywords */}
        {style.keywords && style.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {style.keywords.slice(0, 4).map((keyword) => (
              <span
                key={keyword}
                className="text-[10px] px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded-full"
              >
                {keyword}
              </span>
            ))}
            {style.keywords.length > 4 && (
              <span className="text-[10px] px-2 py-0.5 bg-zinc-800 text-zinc-500 rounded-full">
                +{style.keywords.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Timestamp */}
        <div className="flex items-center gap-1.5 mt-3 text-xs text-zinc-500">
          <Clock className="w-3.5 h-3.5" />
          <span>
            {formatDistanceToNow(new Date(style.created_at), {
              addSuffix: true,
              locale: ja,
            })}
          </span>
        </div>
      </div>
    </div>
  )
}
