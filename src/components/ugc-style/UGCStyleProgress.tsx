'use client'

import {
  Video,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'
import type { UGCStyleSample } from '@/types/ugc-style'

interface UGCStyleProgressProps {
  status: 'analyzing' | 'ready' | 'failed'
  progress: number
  samples?: UGCStyleSample[]
  estimatedTime?: number
  errorMessage?: string
}

const statusConfig = {
  pending: {
    icon: Clock,
    label: '待機中',
    color: 'text-zinc-400',
  },
  analyzing: {
    icon: Loader2,
    label: '分析中',
    color: 'text-yellow-400',
    animate: true,
  },
  completed: {
    icon: CheckCircle2,
    label: '完了',
    color: 'text-emerald-400',
  },
  failed: {
    icon: AlertCircle,
    label: 'エラー',
    color: 'text-red-400',
  },
}

export function UGCStyleProgress({
  status,
  progress,
  samples,
  estimatedTime,
  errorMessage,
}: UGCStyleProgressProps) {
  // Calculate completed count
  const completedCount = samples?.filter((s) => s.analysis_status === 'completed').length || 0
  const totalCount = samples?.length || 0
  const analyzingCount = samples?.filter((s) => s.analysis_status === 'analyzing').length || 0

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">
            {status === 'analyzing' && '動画を分析中...'}
            {status === 'ready' && '分析完了'}
            {status === 'failed' && '分析に失敗しました'}
          </h3>
          <p className="text-sm text-zinc-400 mt-1">
            {status === 'analyzing' && (
              <>
                {completedCount}/{totalCount}本完了
                {estimatedTime && estimatedTime > 0 && (
                  <> · 残り約{Math.ceil(estimatedTime / 60)}分</>
                )}
              </>
            )}
            {status === 'ready' && 'すべてのサンプルの分析が完了しました'}
            {status === 'failed' && (errorMessage || '分析中にエラーが発生しました')}
          </p>
        </div>

        {/* Status Icon */}
        <div
          className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center',
            status === 'analyzing' && 'bg-yellow-400/10',
            status === 'ready' && 'bg-emerald-400/10',
            status === 'failed' && 'bg-red-400/10'
          )}
        >
          {status === 'analyzing' && (
            <Loader2 className="w-6 h-6 text-yellow-400 animate-spin" />
          )}
          {status === 'ready' && (
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          )}
          {status === 'failed' && (
            <AlertCircle className="w-6 h-6 text-red-400" />
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {status === 'analyzing' && (
        <div className="mb-6">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-zinc-500 mt-2 text-right">{progress}%</p>
        </div>
      )}

      {/* Sample List */}
      {samples && samples.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-zinc-400 mb-3">サンプル動画</p>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {samples.map((sample) => {
              const sampleStatus = statusConfig[sample.analysis_status as keyof typeof statusConfig] || statusConfig.pending
              const SampleIcon = sampleStatus.icon

              return (
                <div
                  key={sample.id}
                  className="flex items-center gap-3 p-3 bg-zinc-800 rounded-lg"
                >
                  <div className="w-10 h-10 bg-zinc-700 rounded-lg flex items-center justify-center shrink-0">
                    <Video className="w-5 h-5 text-zinc-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">
                      {sample.filename || sample.video_url.split('/').pop()}
                    </p>
                    {sample.duration_seconds && (
                      <p className="text-xs text-zinc-500">
                        {Math.floor(sample.duration_seconds / 60)}:{String(Math.floor(sample.duration_seconds % 60)).padStart(2, '0')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <SampleIcon
                      className={cn(
                        'w-4 h-4',
                        sampleStatus.color,
                        'animate' in sampleStatus && sampleStatus.animate && 'animate-spin'
                      )}
                    />
                    <span className={cn('text-xs', sampleStatus.color)}>
                      {sampleStatus.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tips */}
      {status === 'analyzing' && (
        <div className="mt-6 p-4 bg-zinc-800/50 rounded-lg">
          <p className="text-xs text-zinc-400">
            <span className="font-medium text-zinc-300">ヒント:</span> 分析にはGemini 2.0を使用しています。
            動画の長さや画質により処理時間が変動します。
          </p>
        </div>
      )}
    </div>
  )
}
