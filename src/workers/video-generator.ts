import { Job } from 'bullmq'
import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import path from 'path'
import fs from 'fs'
import {
  createWorker,
  QUEUE_NAMES,
  VideoGenerationJobData,
} from '@/lib/queue/client'

// 出力ディレクトリ
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'videos')

// Remotion エントリーポイント
const REMOTION_ENTRY = path.join(
  process.cwd(),
  'src',
  'remotion',
  'index.ts'
)

// 動画生成処理
async function processVideoGeneration(
  job: Job<VideoGenerationJobData>
): Promise<{ outputPath: string; duration: number }> {
  const { videoId, compositionId, inputProps } = job.data

  console.log(`[VideoGenerator] Starting job ${job.id} for video ${videoId}`)
  console.log(`[VideoGenerator] Composition: ${compositionId}`)

  // 出力ディレクトリ作成
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  const outputPath = path.join(OUTPUT_DIR, `${videoId}.mp4`)

  try {
    // 進捗更新: バンドル開始
    await job.updateProgress(10)

    // Remotionバンドル作成
    console.log('[VideoGenerator] Bundling Remotion project...')
    const bundleLocation = await bundle({
      entryPoint: REMOTION_ENTRY,
      onProgress: (progress) => {
        // バンドル進捗 (10-30%)
        job.updateProgress(10 + progress * 0.2)
      },
    })

    await job.updateProgress(30)
    console.log('[VideoGenerator] Bundle complete:', bundleLocation)

    // コンポジション選択
    console.log('[VideoGenerator] Selecting composition...')
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: compositionId,
      inputProps,
    })

    await job.updateProgress(40)
    console.log('[VideoGenerator] Composition selected:', composition.id)

    // レンダリング
    console.log('[VideoGenerator] Starting render...')
    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: 'h264',
      outputLocation: outputPath,
      inputProps,
      onProgress: ({ progress }) => {
        // レンダリング進捗 (40-95%)
        job.updateProgress(40 + progress * 0.55)
      },
    })

    await job.updateProgress(95)
    console.log('[VideoGenerator] Render complete:', outputPath)

    // 動画情報取得
    const durationInSeconds = composition.durationInFrames / composition.fps

    await job.updateProgress(100)

    return {
      outputPath: `/videos/${videoId}.mp4`,
      duration: durationInSeconds,
    }
  } catch (error) {
    console.error('[VideoGenerator] Error:', error)
    throw error
  }
}

// ワーカー起動
export function startVideoGeneratorWorker() {
  const worker = createWorker<VideoGenerationJobData>(
    QUEUE_NAMES.VIDEO_GENERATION,
    async (job) => {
      const result = await processVideoGeneration(job)

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
    console.log(`[VideoGenerator] Job ${job.id} completed:`, result)
  })

  worker.on('failed', (job, error) => {
    console.error(`[VideoGenerator] Job ${job?.id} failed:`, error)
  })

  worker.on('progress', (job, progress) => {
    console.log(`[VideoGenerator] Job ${job.id} progress: ${progress}%`)
  })

  console.log('[VideoGenerator] Worker started')

  return worker
}

// スタンドアロン実行用
if (require.main === module) {
  startVideoGeneratorWorker()
}
