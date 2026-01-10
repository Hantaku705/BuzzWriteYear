import { Job } from 'bullmq'
import path from 'path'
import { createWorker, QUEUE_NAMES } from '@/lib/queue/client'
import {
  processUGCVideo,
  UGCEffect,
  applyTikTokUGCPreset,
  applyReviewUGCPreset,
  applyVintageUGCPreset,
} from '@/lib/video/ffmpeg/ugc-processor'

// UGC加工キュー名を追加
export const UGC_PROCESSING_QUEUE = 'ugc-processing'

// ジョブデータ型
export interface UGCProcessingJobData {
  videoId: string
  userId: string
  inputPath: string
  preset?: 'tiktok' | 'review' | 'vintage' | 'custom'
  customEffects?: UGCEffect[]
  intensity?: 'light' | 'medium' | 'heavy'
}

// 出力ディレクトリ
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'videos', 'ugc')

// UGC加工処理
async function processUGCJob(
  job: Job<UGCProcessingJobData>
): Promise<{ outputPath: string; duration: number }> {
  const {
    videoId,
    inputPath,
    preset = 'tiktok',
    customEffects,
    intensity = 'medium',
  } = job.data

  console.log(`[UGC Processor] Starting job ${job.id} for video ${videoId}`)
  console.log(`[UGC Processor] Preset: ${preset}`)

  const outputPath = path.join(OUTPUT_DIR, `${videoId}_ugc.mp4`)

  await job.updateProgress(10)

  let result

  try {
    switch (preset) {
      case 'tiktok':
        console.log('[UGC Processor] Applying TikTok UGC preset...')
        result = await applyTikTokUGCPreset(inputPath, outputPath)
        break

      case 'review':
        console.log('[UGC Processor] Applying Review UGC preset...')
        result = await applyReviewUGCPreset(inputPath, outputPath)
        break

      case 'vintage':
        console.log('[UGC Processor] Applying Vintage UGC preset...')
        result = await applyVintageUGCPreset(inputPath, outputPath)
        break

      case 'custom':
        if (!customEffects || customEffects.length === 0) {
          throw new Error('Custom effects required for custom preset')
        }
        console.log('[UGC Processor] Applying custom effects:', customEffects)
        result = await processUGCVideo({
          inputPath,
          outputPath,
          effects: customEffects,
          intensity,
        })
        break

      default:
        throw new Error(`Unknown preset: ${preset}`)
    }

    await job.updateProgress(100)

    console.log(`[UGC Processor] Complete: ${result.outputPath}`)

    return {
      outputPath: `/videos/ugc/${videoId}_ugc.mp4`,
      duration: result.duration,
    }
  } catch (error) {
    console.error('[UGC Processor] Error:', error)
    throw error
  }
}

// ワーカー起動
export function startUGCProcessorWorker() {
  const worker = createWorker<UGCProcessingJobData>(
    UGC_PROCESSING_QUEUE,
    async (job) => {
      const result = await processUGCJob(job)

      // TODO: Supabaseでビデオステータスを更新
      // const supabase = createClient()
      // await supabase
      //   .from('videos')
      //   .update({
      //     status: 'ready',
      //     local_path: result.outputPath,
      //     duration_seconds: result.duration,
      //   })
      //   .eq('id', job.data.videoId)

      return result
    }
  )

  worker.on('completed', (job, result) => {
    console.log(`[UGC Processor] Job ${job.id} completed:`, result)
  })

  worker.on('failed', (job, error) => {
    console.error(`[UGC Processor] Job ${job?.id} failed:`, error)
  })

  worker.on('progress', (job, progress) => {
    console.log(`[UGC Processor] Job ${job.id} progress: ${progress}%`)
  })

  console.log('[UGC Processor] Worker started')

  return worker
}

// スタンドアロン実行用
if (require.main === module) {
  startUGCProcessorWorker()
}
