/**
 * SNS動画メトリクス・エンゲージメント計算ユーティリティ
 */

/**
 * 動画メトリクス（共通）
 */
export interface VideoMetrics {
  playCount: number       // 再生数
  likeCount: number       // いいね
  commentCount: number    // コメント
  shareCount: number      // シェア
  collectCount?: number   // 保存数（TikTokのみ）
}

/**
 * エンゲージメント率
 */
export interface EngagementRates {
  lvr: number       // いいね率（Like View Rate）
  cvr: number       // コメント率（Comment View Rate）
  svr: number       // シェア率（Share View Rate）
  saveRate: number  // 保存率
  totalER: number   // 総エンゲージメント率
}

/**
 * ベンチマーク（業界平均）
 */
export const BENCHMARKS = {
  lvr: 4.0,         // いいね率 4%
  cvr: 0.2,         // コメント率 0.2%
  svr: 0.15,        // シェア率 0.15%
  saveRate: 0.5,    // 保存率 0.5%
  totalER: 5.0,     // 総エンゲージメント率 5%
} as const

/**
 * エンゲージメント率を計算
 */
export function calculateEngagement(metrics: VideoMetrics): EngagementRates {
  const { playCount, likeCount, commentCount, shareCount, collectCount = 0 } = metrics

  if (playCount === 0) {
    return { lvr: 0, cvr: 0, svr: 0, saveRate: 0, totalER: 0 }
  }

  const lvr = (likeCount / playCount) * 100
  const cvr = (commentCount / playCount) * 100
  const svr = (shareCount / playCount) * 100
  const saveRate = (collectCount / playCount) * 100
  const totalER = ((likeCount + commentCount + shareCount + collectCount) / playCount) * 100

  return {
    lvr: Number(lvr.toFixed(2)),
    cvr: Number(cvr.toFixed(3)),
    svr: Number(svr.toFixed(3)),
    saveRate: Number(saveRate.toFixed(3)),
    totalER: Number(totalER.toFixed(2)),
  }
}

/**
 * ベンチマーク比較結果
 */
export type BenchmarkStatus = 'excellent' | 'above_average' | 'average' | 'below_average'

/**
 * ベンチマークと比較
 */
export function compareWithBenchmark(
  value: number,
  benchmark: number
): { status: BenchmarkStatus; label: string; ratio: number } {
  const ratio = benchmark > 0 ? value / benchmark : 0

  if (ratio >= 1.5) {
    return { status: 'excellent', label: '優秀', ratio }
  }
  if (ratio >= 1.0) {
    return { status: 'above_average', label: '平均以上', ratio }
  }
  if (ratio >= 0.7) {
    return { status: 'average', label: '平均', ratio }
  }
  return { status: 'below_average', label: '要改善', ratio }
}

/**
 * メトリクスのサマリーを生成
 */
export function generateMetricsSummary(metrics: VideoMetrics): {
  engagement: EngagementRates
  benchmarkComparison: {
    lvr: ReturnType<typeof compareWithBenchmark>
    cvr: ReturnType<typeof compareWithBenchmark>
    svr: ReturnType<typeof compareWithBenchmark>
    saveRate: ReturnType<typeof compareWithBenchmark>
    totalER: ReturnType<typeof compareWithBenchmark>
  }
} {
  const engagement = calculateEngagement(metrics)

  return {
    engagement,
    benchmarkComparison: {
      lvr: compareWithBenchmark(engagement.lvr, BENCHMARKS.lvr),
      cvr: compareWithBenchmark(engagement.cvr, BENCHMARKS.cvr),
      svr: compareWithBenchmark(engagement.svr, BENCHMARKS.svr),
      saveRate: compareWithBenchmark(engagement.saveRate, BENCHMARKS.saveRate),
      totalER: compareWithBenchmark(engagement.totalER, BENCHMARKS.totalER),
    },
  }
}

/**
 * 数値をフォーマット（K, M表記）
 */
export function formatCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`
  }
  return count.toString()
}

/**
 * パーセンテージをフォーマット
 */
export function formatPercent(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`
}

/**
 * 複数動画のメトリクスを集計
 */
export function aggregateMetrics(videos: VideoMetrics[]): VideoMetrics {
  return videos.reduce(
    (acc, video) => ({
      playCount: acc.playCount + video.playCount,
      likeCount: acc.likeCount + video.likeCount,
      commentCount: acc.commentCount + video.commentCount,
      shareCount: acc.shareCount + video.shareCount,
      collectCount: (acc.collectCount || 0) + (video.collectCount || 0),
    }),
    { playCount: 0, likeCount: 0, commentCount: 0, shareCount: 0, collectCount: 0 }
  )
}

/**
 * 平均メトリクスを計算
 */
export function calculateAverageMetrics(videos: VideoMetrics[]): VideoMetrics {
  if (videos.length === 0) {
    return { playCount: 0, likeCount: 0, commentCount: 0, shareCount: 0, collectCount: 0 }
  }

  const total = aggregateMetrics(videos)
  const count = videos.length

  return {
    playCount: Math.round(total.playCount / count),
    likeCount: Math.round(total.likeCount / count),
    commentCount: Math.round(total.commentCount / count),
    shareCount: Math.round(total.shareCount / count),
    collectCount: Math.round((total.collectCount || 0) / count),
  }
}
