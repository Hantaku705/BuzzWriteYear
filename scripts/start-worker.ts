/**
 * Kling AI ワーカー起動スクリプト
 *
 * 使用方法:
 * npx tsx scripts/start-worker.ts
 */

import 'dotenv/config'
import { Worker, Job } from 'bullmq'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

// 環境変数チェック
const requiredEnvVars = [
  'REDIS_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'KLING_API_KEY',
]

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Error: ${envVar} is not set`)
    process.exit(1)
  }
}

// Redis接続設定
const redisUrl = process.env.REDIS_URL!
const url = new URL(redisUrl)
const useTls = url.protocol === 'rediss:'

const connection = {
  host: url.hostname,
  port: parseInt(url.port) || 6379,
  password: url.password || undefined,
  username: url.username || undefined,
  maxRetriesPerRequest: null,
  tls: useTls ? {} : undefined,
}

// Supabaseクライアント
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Kling API関連 (PiAPI)
const KLING_API_BASE = 'https://api.piapi.ai'

interface KlingJobData {
  videoId: string
  userId: string
  productId: string
  mode: 'image-to-video' | 'text-to-video'
  imageUrl?: string
  prompt: string
  negativePrompt?: string
  duration: 5 | 10
  presetId?: string
}

// 進捗更新
async function updateVideoProgress(videoId: string, progress: number, message: string) {
  const { error } = await supabase
    .from('videos')
    .update({ progress, progress_message: message } as never)
    .eq('id', videoId)

  if (error) {
    console.error(`Failed to update progress: ${error.message}`)
  }
}

// ステータス更新
async function updateVideoStatus(
  videoId: string,
  status: 'generating' | 'ready' | 'failed' | 'cancelled',
  updates: Record<string, unknown> = {}
) {
  const { error } = await supabase
    .from('videos')
    .update({ status, ...updates } as never)
    .eq('id', videoId)

  if (error) {
    console.error(`Failed to update status: ${error.message}`)
  }
}

// キャンセルチェック
async function checkIfCancelled(videoId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('videos')
    .select('status')
    .eq('id', videoId)
    .single()

  if (error || !data) return false
  return (data as { status: string }).status === 'cancelled'
}

// Kling API: 動画生成開始
async function generateVideo(params: {
  mode: string
  prompt: string
  imageUrl?: string
  negativePrompt?: string
  duration: number
  aspectRatio: string
}): Promise<{ task_id: string }> {
  const input: Record<string, unknown> = {
    prompt: params.prompt,
    negative_prompt: params.negativePrompt || 'blurry, low quality',
    duration: params.duration,
    aspect_ratio: params.aspectRatio,
    mode: 'std',
    version: '1.6',
  }

  // image_urlがあればimage-to-video、なければtext-to-video
  if (params.imageUrl) {
    input.image_url = params.imageUrl
  }

  const body = {
    model: 'kling',
    task_type: 'video_generation',
    input,
  }

  console.log('[Worker] API Request:', JSON.stringify(body, null, 2))

  const response = await fetch(`${KLING_API_BASE}/api/v1/task`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.KLING_API_KEY!,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`Kling API error: ${response.status} - ${JSON.stringify(errorData)}`)
  }

  const data = await response.json()
  return { task_id: data.data?.task_id || data.task_id }
}

// Kling API: タスクステータス取得
async function getTaskStatus(taskId: string): Promise<{
  status: string
  progress?: number
  video_url?: string
}> {
  const response = await fetch(`${KLING_API_BASE}/api/v1/task/${taskId}`, {
    headers: {
      'x-api-key': process.env.KLING_API_KEY!,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to get task status: ${response.status}`)
  }

  const data = await response.json()
  const taskData = data.data || data

  // video_urlの取得先を複数試す
  const videoUrl = taskData.video_url
    || taskData.output?.video_url
    || taskData.output?.video
    || taskData.works?.[0]?.video?.url
    || taskData.works?.[0]?.video?.resource

  if (taskData.status === 'completed' || taskData.status === 'succeed') {
    console.log('[Worker] Full response:', JSON.stringify(data, null, 2))
  }

  return {
    status: taskData.status || taskData.task_status,
    progress: taskData.progress,
    video_url: videoUrl,
  }
}

// 動画ダウンロード
async function downloadVideo(url: string, outputPath: string): Promise<void> {
  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to download video')

  const buffer = Buffer.from(await response.arrayBuffer())
  fs.writeFileSync(outputPath, buffer)
}

// Storageにアップロード
async function uploadToStorage(localPath: string, videoId: string, userId: string): Promise<string> {
  const fileBuffer = fs.readFileSync(localPath)
  const fileName = `${userId}/${videoId}.mp4`

  const { error } = await supabase.storage
    .from('videos')
    .upload(fileName, fileBuffer, {
      contentType: 'video/mp4',
      upsert: true,
    })

  if (error) throw new Error(`Upload failed: ${error.message}`)

  const { data } = supabase.storage.from('videos').getPublicUrl(fileName)
  return data.publicUrl
}

// 進捗メッセージ
function getProgressMessage(progress: number): string {
  if (progress < 10) return 'リクエストを送信中...'
  if (progress < 30) return 'AI処理待機中...'
  if (progress < 80) return '動画を生成中...'
  if (progress < 95) return '動画をレンダリング中...'
  return 'アップロード中...'
}

// ジョブ処理
async function processKlingJob(job: Job<KlingJobData>) {
  const { videoId, userId, mode, imageUrl, prompt, negativePrompt, duration } = job.data

  console.log(`[Worker] Processing job ${job.id} for video ${videoId}`)

  try {
    // キャンセルチェック
    if (await checkIfCancelled(videoId)) {
      console.log(`[Worker] Job ${job.id} was cancelled`)
      return { success: false, cancelled: true }
    }

    await updateVideoStatus(videoId, 'generating', {
      progress: 5,
      progress_message: 'リクエストを送信中...',
    })

    // Kling API呼び出し
    console.log(`[Worker] Calling Kling API...`)
    await updateVideoProgress(videoId, 10, 'AI処理待機中...')

    const taskResponse = await generateVideo({
      mode,
      prompt,
      imageUrl,
      negativePrompt: negativePrompt || 'blurry, low quality, distorted',
      duration,
      aspectRatio: '9:16',
    })

    console.log(`[Worker] Task created: ${taskResponse.task_id}`)

    // ポーリングで完了待ち
    let attempts = 0
    const maxAttempts = 60 // 10分
    let videoUrl: string | undefined

    while (attempts < maxAttempts) {
      // キャンセルチェック
      if (await checkIfCancelled(videoId)) {
        console.log(`[Worker] Job cancelled during generation`)
        return { success: false, cancelled: true }
      }

      const status = await getTaskStatus(taskResponse.task_id)
      console.log(`[Worker] Task status: ${status.status}, progress: ${status.progress}`)

      if (status.status === 'completed' || status.status === 'succeed') {
        videoUrl = status.video_url
        break
      }

      if (status.status === 'failed') {
        throw new Error('Kling task failed')
      }

      // 進捗更新
      const apiProgress = status.progress || 0
      const mappedProgress = Math.min(10 + Math.floor(apiProgress * 0.75), 85)
      await updateVideoProgress(videoId, mappedProgress, getProgressMessage(mappedProgress))

      attempts++
      await new Promise(resolve => setTimeout(resolve, 10000)) // 10秒待機
    }

    if (!videoUrl) {
      throw new Error('Video generation timed out')
    }

    console.log(`[Worker] Video generated: ${videoUrl}`)
    await updateVideoProgress(videoId, 95, '完了処理中...')

    // 動画URLを直接保存（Supabase Storageへの再アップロードはスキップ）
    await updateVideoStatus(videoId, 'ready', {
      remote_url: videoUrl,
      duration_seconds: duration,
      progress: 100,
      progress_message: '生成完了',
    })

    console.log(`[Worker] Job ${job.id} completed!`)
    return { success: true, videoId, videoUrl }

  } catch (error) {
    console.error(`[Worker] Job ${job.id} failed:`, error)
    await updateVideoStatus(videoId, 'failed', {
      progress: 0,
      progress_message: '生成に失敗しました',
    })
    throw error
  }
}

// ワーカー起動
console.log('[Worker] Starting Kling worker...')
console.log(`[Worker] Redis: ${url.hostname}:${url.port} (TLS: ${useTls})`)

const worker = new Worker('kling-generation', processKlingJob, {
  connection,
  concurrency: 2,
})

worker.on('ready', () => {
  console.log('[Worker] Worker is ready and listening for jobs')
})

worker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completed`)
})

worker.on('failed', (job, error) => {
  console.error(`[Worker] Job ${job?.id} failed:`, error.message)
})

worker.on('error', (error) => {
  console.error('[Worker] Worker error:', error)
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Worker] Shutting down...')
  await worker.close()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('[Worker] Shutting down...')
  await worker.close()
  process.exit(0)
})
