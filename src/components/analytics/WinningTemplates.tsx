'use client'

import { useMemo } from 'react'
import { Trophy, TrendingUp, Flame, Target, Crown } from 'lucide-react'

interface TemplatePerformance {
  id: string
  name: string
  type: 'remotion' | 'heygen' | 'ffmpeg'
  contentType: string
  videoCount: number
  totalViews: number
  totalGmv: number
  avgConversionRate: number
  performanceScore: number
}

interface WinningTemplatesProps {
  templates: TemplatePerformance[]
}

// パフォーマンススコア計算
export function calculatePerformanceScore(template: {
  totalViews: number
  totalGmv: number
  avgConversionRate: number
  videoCount: number
}): number {
  // スコア計算式:
  // - GMV per video: 40%
  // - Conversion rate: 30%
  // - Views per video: 20%
  // - Statistical significance (video count): 10%

  const gmvPerVideo = template.totalGmv / Math.max(template.videoCount, 1)
  const viewsPerVideo = template.totalViews / Math.max(template.videoCount, 1)

  // 正規化（0-100スケール）
  const gmvScore = Math.min(gmvPerVideo / 100000 * 100, 100) * 0.4
  const cvrScore = Math.min(template.avgConversionRate * 100 * 10, 100) * 0.3
  const viewScore = Math.min(viewsPerVideo / 100000 * 100, 100) * 0.2
  const significanceScore = Math.min(template.videoCount / 10 * 100, 100) * 0.1

  return gmvScore + cvrScore + viewScore + significanceScore
}

const RankBadge = ({ rank }: { rank: number }) => {
  if (rank === 1) {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-500/20 text-yellow-500">
        <Crown className="h-4 w-4" />
      </div>
    )
  }
  if (rank === 2) {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-400/20 text-zinc-400">
        <span className="font-bold">{rank}</span>
      </div>
    )
  }
  if (rank === 3) {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-600/20 text-orange-600">
        <span className="font-bold">{rank}</span>
      </div>
    )
  }
  return (
    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-700 text-zinc-400">
      <span className="font-medium">{rank}</span>
    </div>
  )
}

const PerformanceBar = ({ score }: { score: number }) => {
  const getBarColor = (score: number) => {
    if (score >= 80) return 'bg-green-500'
    if (score >= 60) return 'bg-blue-500'
    if (score >= 40) return 'bg-yellow-500'
    return 'bg-zinc-500'
  }

  return (
    <div className="w-full h-2 bg-zinc-700 rounded-full overflow-hidden">
      <div
        className={`h-full ${getBarColor(score)} transition-all duration-500`}
        style={{ width: `${Math.min(score, 100)}%` }}
      />
    </div>
  )
}

export function WinningTemplates({ templates }: WinningTemplatesProps) {
  const rankedTemplates = useMemo(() => {
    return [...templates]
      .map((t) => ({
        ...t,
        performanceScore: calculatePerformanceScore(t),
      }))
      .sort((a, b) => b.performanceScore - a.performanceScore)
  }, [templates])

  const topTemplate = rankedTemplates[0]

  return (
    <div className="space-y-6">
      {/* トップパフォーマー */}
      {topTemplate && topTemplate.performanceScore >= 50 && (
        <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <Trophy className="h-6 w-6 text-yellow-500" />
            <div>
              <div className="text-sm text-yellow-500 font-medium">
                勝ちテンプレート
              </div>
              <div className="text-lg font-bold text-zinc-100">
                {topTemplate.name}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-zinc-400">GMV貢献</div>
              <div className="font-semibold text-green-400">
                ¥{topTemplate.totalGmv.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-zinc-400">CVR</div>
              <div className="font-semibold text-blue-400">
                {(topTemplate.avgConversionRate * 100).toFixed(2)}%
              </div>
            </div>
            <div>
              <div className="text-zinc-400">スコア</div>
              <div className="font-semibold text-yellow-400">
                {topTemplate.performanceScore.toFixed(1)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ランキングリスト */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-zinc-400">
          テンプレートランキング
        </h3>
        {rankedTemplates.map((template, index) => (
          <div
            key={template.id}
            className="flex items-center gap-4 bg-zinc-800 rounded-lg p-4"
          >
            <RankBadge rank={index + 1} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-zinc-100 truncate">
                  {template.name}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-zinc-700 text-zinc-400">
                  {template.type}
                </span>
              </div>
              <div className="mt-2">
                <PerformanceBar score={template.performanceScore} />
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-zinc-400">
                <span>{template.videoCount}本</span>
                <span>¥{template.totalGmv.toLocaleString()}</span>
                <span>CVR {(template.avgConversionRate * 100).toFixed(2)}%</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-zinc-100">
                {template.performanceScore.toFixed(0)}
              </div>
              <div className="text-xs text-zinc-500">スコア</div>
            </div>
          </div>
        ))}
      </div>

      {rankedTemplates.length === 0 && (
        <div className="text-center py-8 text-zinc-500">
          テンプレートデータがありません
        </div>
      )}
    </div>
  )
}

// 推奨アクションカード
export function RecommendedActions({
  topTemplate,
  lowPerformers,
}: {
  topTemplate?: TemplatePerformance
  lowPerformers: TemplatePerformance[]
}) {
  const actions = useMemo(() => {
    const result: { icon: typeof Flame; title: string; description: string; priority: 'high' | 'medium' | 'low' }[] = []

    if (topTemplate && topTemplate.performanceScore >= 60) {
      result.push({
        icon: Flame,
        title: `${topTemplate.name}を増産`,
        description: `スコア${topTemplate.performanceScore.toFixed(0)}の勝ちテンプレートで動画を量産しましょう`,
        priority: 'high',
      })
    }

    if (lowPerformers.length > 0) {
      result.push({
        icon: Target,
        title: '低パフォーマンステンプレートを見直し',
        description: `${lowPerformers.map((t) => t.name).join('、')}のコンテンツを改善しましょう`,
        priority: 'medium',
      })
    }

    return result
  }, [topTemplate, lowPerformers])

  if (actions.length === 0) return null

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-zinc-400">推奨アクション</h3>
      {actions.map((action, index) => (
        <div
          key={index}
          className={`flex items-start gap-3 p-4 rounded-lg ${
            action.priority === 'high'
              ? 'bg-green-500/10 border border-green-500/30'
              : 'bg-zinc-800'
          }`}
        >
          <action.icon
            className={`h-5 w-5 mt-0.5 ${
              action.priority === 'high' ? 'text-green-500' : 'text-zinc-400'
            }`}
          />
          <div>
            <div className="font-medium text-zinc-100">{action.title}</div>
            <div className="text-sm text-zinc-400">{action.description}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
