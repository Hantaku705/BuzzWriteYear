import { Job } from 'bullmq'
import { createClient } from '@supabase/supabase-js'
import {
  createWorker,
  QUEUE_NAMES,
  HeyGenJobData,
} from '@/lib/queue/client'
import {
  generateVideo,
  waitForVideoCompletion,
} from '@/lib/video/heygen/client'

// Service role Supabaseクライアント
const getServiceSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

// 進捗更新
async function updateVideoProgress(
  videoId: string,
  progress: number,
  progressMessage?: string
) {
  const supabase = getServiceSupabase()
  await supabase
    .from('videos')
    .update({
      progress,
      progress_message: progressMessage,
    } as never)
    .eq('id', videoId)
}

// ステータス更新
async function updateVideoStatus(
  videoId: string,
  status: 'generating' | 'ready' | 'failed' | 'cancelled',
  updates: {
    remote_url?: string
    duration_seconds?: number
    progress_message?: string
  } = {}
) {
  const supabase = getServiceSupabase()
  const { error } = await supabase
    .from('videos')
    .update({
      status,
      progress: status === 'ready' ? 100 : status === 'failed' ? 0 : undefined,
      ...updates,
    } as never)
    .eq('id', videoId)

  if (error) {
    console.error('[HeyGen Generator] Failed to update video status:', error)
  }
}

// HeyGen動画生成処理
async function processHeyGenGeneration(
  job: Job<HeyGenJobData>
): Promise<{ remoteUrl: string; duration: number }> {
  const { videoId, avatarId, script, voiceId, backgroundUrl } = job.data

  console.log(`[HeyGen Generator] Starting job ${job.id} for video ${videoId}`)
  console.log(`[HeyGen Generator] Avatar: ${avatarId}`)

  const supabase = getServiceSupabase()

  try {
    // 進捗更新: 生成開始
    await job.updateProgress(10)
    await updateVideoProgress(videoId, 10, 'HeyGen APIに送信中...')

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
    await updateVideoProgress(videoId, 20, 'アバター動画を生成中...')
    console.log('[HeyGen Generator] Video ID:', generateResponse.video_id)

    // 生成完了まで待機
    console.log('[HeyGen Generator] Waiting for completion...')
    const completedVideo = await waitForVideoCompletion(
      generateResponse.video_id,
      {
        maxAttempts: 120, // 最大20分待機
        pollInterval: 10000, // 10秒ごと
        onProgress: async (status) => {
          console.log(`[HeyGen Generator] Status: ${status.status}`)
          // 進捗更新: 20-80%
          if (status.status === 'processing') {
            await job.updateProgress(50)
            await updateVideoProgress(videoId, 50, 'アバター動画をレンダリング中...')
          }
        },
      }
    )

    await job.updateProgress(80)
    await updateVideoProgress(videoId, 80, '動画をダウンロード中...')
    console.log('[HeyGen Generator] Video completed:', completedVideo.video_url)

    // 動画ダウンロード
    if (!completedVideo.video_url) {
      throw new Error('Video URL not available')
    }

    console.log('[HeyGen Generator] Downloading video...')
    const videoResponse = await fetch(completedVideo.video_url)
    if (!videoResponse.ok) {
      throw new Error('Failed to download video from HeyGen')
    }
    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer())

    await job.updateProgress(90)
    await updateVideoProgress(videoId, 90, 'Supabase Storageにアップロード中...')

    // Supabase Storageにアップロード
    const fileName = `heygen/${videoId}.mp4`
    const videoBlob = new Blob([videoBuffer], { type: 'video/mp4' })

    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(fileName, videoBlob, {
        contentType: 'video/mp4',
        upsert: true,
      })

    if (uploadError) {
      throw new Error(`Failed to upload to Storage: ${uploadError.message}`)
    }

    // Public URLを取得
    const { data: { publicUrl } } = supabase.storage
      .from('videos')
      .getPublicUrl(fileName)

    console.log('[HeyGen Generator] Uploaded to Storage:', publicUrl)

    // 動画情報
    const duration = completedVideo.duration || 0

    await job.updateProgress(100)

    // 成功時のDB更新
    await updateVideoStatus(videoId, 'ready', {
      remote_url: publicUrl,
      duration_seconds: duration,
      progress_message: '生成完了',
    })

    return {
      remoteUrl: publicUrl,
      duration,
    }
  } catch (error) {
    console.error('[HeyGen Generator] Error:', error)

    // 失敗時のDB更新
    await updateVideoStatus(videoId, 'failed', {
      progress_message: error instanceof Error ? error.message : 'Unknown error',
    })

    throw error
  }
}

// ワーカー起動
export function startHeyGenGeneratorWorker() {
  const worker = createWorker<HeyGenJobData>(
    QUEUE_NAMES.HEYGEN_GENERATION,
    async (job) => {
      return await processHeyGenGeneration(job)
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
