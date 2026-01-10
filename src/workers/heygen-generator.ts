import { Job } from 'bullmq'
import path from 'path'
import fs from 'fs'
import {
  createWorker,
  QUEUE_NAMES,
  HeyGenJobData,
} from '@/lib/queue/client'
import {
  generateVideo,
  waitForVideoCompletion,
  downloadVideo,
} from '@/lib/video/heygen/client'

// 出力ディレクトリ
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'videos', 'heygen')

// HeyGen動画生成処理
async function processHeyGenGeneration(
  job: Job<HeyGenJobData>
): Promise<{ outputPath: string; duration: number }> {
  const { videoId, avatarId, script, voiceId, backgroundUrl } = job.data

  console.log(`[HeyGen Generator] Starting job ${job.id} for video ${videoId}`)
  console.log(`[HeyGen Generator] Avatar: ${avatarId}`)

  // 出力ディレクトリ作成
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  const outputPath = path.join(OUTPUT_DIR, `${videoId}.mp4`)

  try {
    // 進捗更新: 生成開始
    await job.updateProgress(10)

    // HeyGen動画生成リクエスト
    console.log('[HeyGen Generator] Sending generation request...')
    const generateResponse = await generateVideo({
      avatar_id: avatarId,
      script,
      voice_id: voiceId,
      background: backgroundUrl
        ? { type: 'image', value: backgroundUrl }
        : { type: 'color', value: '#1a1a2e' }, // デフォルト: ダークブルー
      dimension: {
        width: 1080,
        height: 1920, // TikTok縦型
      },
    })

    await job.updateProgress(20)
    console.log('[HeyGen Generator] Video ID:', generateResponse.video_id)

    // 生成完了まで待機
    console.log('[HeyGen Generator] Waiting for completion...')
    const completedVideo = await waitForVideoCompletion(
      generateResponse.video_id,
      {
        maxAttempts: 120, // 最大20分待機
        pollInterval: 10000, // 10秒ごと
        onProgress: (status) => {
          console.log(`[HeyGen Generator] Status: ${status.status}`)
          // 進捗更新: 20-80%
          if (status.status === 'processing') {
            job.updateProgress(50)
          }
        },
      }
    )

    await job.updateProgress(80)
    console.log('[HeyGen Generator] Video completed:', completedVideo.video_url)

    // 動画ダウンロード
    if (!completedVideo.video_url) {
      throw new Error('Video URL not available')
    }

    console.log('[HeyGen Generator] Downloading video...')
    await downloadVideo(completedVideo.video_url, outputPath)

    await job.updateProgress(95)
    console.log('[HeyGen Generator] Download complete:', outputPath)

    // 動画情報
    const duration = completedVideo.duration || 0

    await job.updateProgress(100)

    return {
      outputPath: `/videos/heygen/${videoId}.mp4`,
      duration,
    }
  } catch (error) {
    console.error('[HeyGen Generator] Error:', error)
    throw error
  }
}

// ワーカー起動
export function startHeyGenGeneratorWorker() {
  const worker = createWorker<HeyGenJobData>(
    QUEUE_NAMES.HEYGEN_GENERATION,
    async (job) => {
      const result = await processHeyGenGeneration(job)

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
    console.log(`[HeyGen Generator] Job ${job.id} completed:`, result)
  })

  worker.on('failed', (job, error) => {
    console.error(`[HeyGen Generator] Job ${job?.id} failed:`, error)
  })

  worker.on('progress', (job, progress) => {
    console.log(`[HeyGen Generator] Job ${job.id} progress: ${progress}%`)
  })

  console.log('[HeyGen Generator] Worker started')

  return worker
}

// スタンドアロン実行用
if (require.main === module) {
  startHeyGenGeneratorWorker()
}
