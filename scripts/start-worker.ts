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
  imageTailUrl?: string           // O1デュアルキーフレーム（終了フレーム）
  prompt: string
  negativePrompt?: string
  duration: 5 | 10
  presetId?: string
  // O1新パラメータ
  modelVersion?: '1.5' | '1.6' | '2.1' | '2.1-master' | '2.5' | '2.6'
  aspectRatio?: '16:9' | '9:16' | '1:1'
  quality?: 'standard' | 'pro'
  cfgScale?: number
  enableAudio?: boolean           // 2.6のみ
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
  imageTailUrl?: string           // O1デュアルキーフレーム
  negativePrompt?: string
  duration: number
  aspectRatio: string
  modelVersion?: string           // モデルバージョン
  quality?: string                // standard | pro
  cfgScale?: number               // 0.0 - 1.0
  enableAudio?: boolean           // 2.6のみ
}): Promise<{ task_id: string }> {
  const modelVersion = params.modelVersion || '1.6'

  const input: Record<string, unknown> = {
    prompt: params.prompt,
    negative_prompt: params.negativePrompt || 'blurry, low quality',
    duration: params.duration,
    aspect_ratio: params.aspectRatio,
    mode: params.quality === 'pro' ? 'pro' : 'std',
    version: modelVersion,
  }

  // image_urlがあればimage-to-video、なければtext-to-video
  if (params.imageUrl) {
    input.image_url = params.imageUrl
  }

  // O1デュアルキーフレーム: 終了フレーム画像
  if (params.imageTailUrl) {
    input.image_tail_url = params.imageTailUrl
  }

  // CFG Scale
  if (params.cfgScale !== undefined) {
    input.cfg_scale = params.cfgScale
  }

  // 音声生成 (2.6のみ)
  if (params.enableAudio && modelVersion === '2.6') {
    input.enable_audio = true
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
  const {
    videoId,
    userId,
    mode,
    imageUrl,
    imageTailUrl,
    prompt,
    negativePrompt,
    duration,
    modelVersion,
    aspectRatio,
    quality,
    cfgScale,
    enableAudio,
  } = job.data

  console.log(`[Worker] Processing job ${job.id} for video ${videoId}`)
  console.log(`[Worker] Model: ${modelVersion || '1.6'}, Aspect: ${aspectRatio || '9:16'}, Quality: ${quality || 'standard'}`)

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
      imageTailUrl,
      negativePrompt: negativePrompt || 'blurry, low quality, distorted',
      duration,
      aspectRatio: aspectRatio || '9:16',
      modelVersion: modelVersion || '1.6',
      quality: quality || 'standard',
      cfgScale,
      enableAudio,
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

// パイプラインワーカーも起動
import {
  runVideoPipeline,
  createTikTokUGCPipeline,
  createReviewPipeline,
  createSimpleOptimizePipeline,
  PipelineConfig,
  PipelineStage,
} from '../src/lib/video/pipeline'
import { UGCEffect } from '../src/lib/video/ffmpeg'

interface PipelineJobData {
  videoId: string
  userId: string
  sourceUrl: string
  preset: 'tiktok_ugc' | 'review' | 'simple' | 'custom'
  config?: {
    ugcEffects?: {
      enabled: boolean
      effects: string[]
      intensity?: 'light' | 'medium' | 'heavy'
    }
    trim?: {
      enabled: boolean
      startTime: number
      endTime?: number
    }
    subtitles?: {
      enabled: boolean
      entries: Array<{
        startTime: number
        endTime: number
        text: string
      }>
    }
    optimize?: {
      enabled: boolean
      platform: 'tiktok' | 'instagram_reels' | 'youtube_shorts' | 'twitter'
    }
  }
}

function createPipelineFromPreset(
  inputPath: string,
  preset: PipelineJobData['preset'],
  customConfig?: PipelineJobData['config']
): PipelineConfig {
  switch (preset) {
    case 'tiktok_ugc':
      return createTikTokUGCPipeline(inputPath)
    case 'review':
      return createReviewPipeline(inputPath)
    case 'simple':
      return createSimpleOptimizePipeline(inputPath, 'tiktok')
    case 'custom':
      if (!customConfig) {
        return createSimpleOptimizePipeline(inputPath, 'tiktok')
      }
      return {
        inputPath,
        ugcEffects: customConfig.ugcEffects
          ? {
              enabled: customConfig.ugcEffects.enabled,
              effects: customConfig.ugcEffects.effects as UGCEffect[],
              intensity: customConfig.ugcEffects.intensity,
            }
          : undefined,
        trim: customConfig.trim,
        subtitles: customConfig.subtitles,
        optimize: customConfig.optimize,
        thumbnail: { enabled: true },
      }
    default:
      return createSimpleOptimizePipeline(inputPath, 'tiktok')
  }
}

async function processPipelineJob(job: Job<PipelineJobData>) {
  const { videoId, userId, sourceUrl, preset, config } = job.data
  const tempDir = path.join(os.tmpdir(), `pipeline_${videoId}`)

  try {
    console.log(`[Pipeline] Processing job ${job.id} for video ${videoId}`)

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }

    // ダウンロード
    await updateVideoProgress(videoId, 5, '動画をダウンロード中...')
    const inputPath = path.join(tempDir, 'input.mp4')
    await downloadVideo(sourceUrl, inputPath)

    // パイプライン実行
    const pipelineConfig = createPipelineFromPreset(inputPath, preset, config)
    pipelineConfig.outputDir = tempDir
    pipelineConfig.onProgress = async (stage: PipelineStage, progress: number, message: string) => {
      await updateVideoProgress(videoId, progress, message)
    }

    const result = await runVideoPipeline(pipelineConfig)

    if (!result.success) {
      throw new Error(result.error || 'Pipeline failed')
    }

    // アップロード
    await updateVideoProgress(videoId, 90, 'アップロード中...')
    const videoUrl = await uploadToStorage(result.outputPath, videoId, userId)

    // 完了
    await updateVideoStatus(videoId, 'ready', {
      remote_url: videoUrl,
      duration_seconds: Math.round(result.metadata.duration),
      progress: 100,
      progress_message: '処理完了',
    })

    console.log(`[Pipeline] Job ${job.id} completed!`)
    return { success: true, videoId, videoUrl }

  } catch (error) {
    console.error(`[Pipeline] Job ${job.id} failed:`, error)
    await updateVideoStatus(videoId, 'failed', {
      progress: 0,
      progress_message: '処理に失敗しました',
    })
    throw error
  } finally {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true })
      }
    } catch (e) {
      console.warn(`[Pipeline] Failed to cleanup: ${tempDir}`)
    }
  }
}

const pipelineWorker = new Worker('video-pipeline', processPipelineJob, {
  connection,
  concurrency: 1, // FFmpeg処理のため同時実行数を制限
})

pipelineWorker.on('ready', () => {
  console.log('[Pipeline] Worker is ready')
})

pipelineWorker.on('completed', (job) => {
  console.log(`[Pipeline] Job ${job.id} completed`)
})

pipelineWorker.on('failed', (job, error) => {
  console.error(`[Pipeline] Job ${job?.id} failed:`, error.message)
})

// バリアント生成ワーカー
import {
  processUGCVideo,
  burnSubtitles,
  generateProductSubtitles,
  convertForPlatform,
  type UGCEffect as UGCEffectType,
} from '../src/lib/video/ffmpeg'

interface VariantJobData {
  sourceVideoId: string
  sourceUrl: string
  variantIds: string[]
  userId: string
  preset: 'tiktok_ab' | 'multi_platform' | 'full_test' | 'custom'
  customVariants?: Array<{
    name: string
    ugcEffects?: {
      effects: string[]
      intensity: 'light' | 'medium' | 'heavy'
    }
    subtitles?: {
      entries: Array<{
        startTime: number
        endTime: number
        text: string
      }>
    }
    platform?: 'tiktok' | 'instagram_reels' | 'youtube_shorts' | 'twitter'
  }>
  subtitleTexts?: string[]
  duration: number
}

// プリセットごとのバリアント設定
const VARIANT_PRESETS = {
  tiktok_ab: [
    { name: 'オリジナル' },
    { name: 'UGC風ライト', ugcEffects: { effects: ['phone_quality'], intensity: 'light' as const } },
    { name: 'UGC風ヘビー', ugcEffects: { effects: ['camera_shake', 'phone_quality', 'film_grain'], intensity: 'medium' as const } },
    { name: 'ヴィンテージ', ugcEffects: { effects: ['vintage_filter', 'film_grain'], intensity: 'medium' as const } },
  ],
  multi_platform: [
    { name: 'TikTok', platform: 'tiktok' as const },
    { name: 'Instagram Reels', platform: 'instagram_reels' as const },
    { name: 'YouTube Shorts', platform: 'youtube_shorts' as const },
    { name: 'Twitter/X', platform: 'twitter' as const },
  ],
  full_test: [
    { name: 'オリジナル' },
    { name: 'UGCライト', ugcEffects: { effects: ['phone_quality'], intensity: 'light' as const } },
    { name: 'UGCミディアム', ugcEffects: { effects: ['camera_shake', 'phone_quality'], intensity: 'medium' as const } },
    { name: '字幕付き', subtitles: true },
    { name: 'UGC+字幕', ugcEffects: { effects: ['phone_quality'], intensity: 'light' as const }, subtitles: true },
  ],
}

async function processVariantJob(job: Job<VariantJobData>) {
  const { sourceVideoId, sourceUrl, variantIds, userId, preset, customVariants, subtitleTexts, duration } = job.data
  const tempDir = path.join(os.tmpdir(), `variants_${sourceVideoId}`)

  try {
    console.log(`[Variant] Processing job ${job.id} for ${variantIds.length} variants`)

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }

    // 元動画をダウンロード
    const inputPath = path.join(tempDir, 'source.mp4')
    await downloadVideo(sourceUrl, inputPath)
    console.log(`[Variant] Downloaded source video`)

    // バリアント設定を取得
    const presetVariants = preset !== 'custom' ? VARIANT_PRESETS[preset] : undefined
    const variants = customVariants || (presetVariants as typeof customVariants) || []

    // 字幕エントリを生成
    const subtitleEntries = subtitleTexts?.length
      ? generateProductSubtitles(subtitleTexts, duration)
      : undefined

    // 各バリアントを処理
    for (let i = 0; i < Math.min(variants.length, variantIds.length); i++) {
      const variantId = variantIds[i]
      const variantConfig = variants[i]

      try {
        console.log(`[Variant] Processing variant ${i + 1}/${variants.length}: ${variantConfig.name}`)
        await updateVideoProgress(variantId, 10 + (i * 80 / variants.length), `${variantConfig.name}を処理中...`)

        let currentPath = inputPath
        let needsCleanup: string[] = []

        // UGC加工
        if (variantConfig.ugcEffects) {
          const ugcOutputPath = path.join(tempDir, `variant_${i}_ugc.mp4`)
          await processUGCVideo({
            inputPath: currentPath,
            outputPath: ugcOutputPath,
            effects: variantConfig.ugcEffects.effects as UGCEffectType[],
            intensity: variantConfig.ugcEffects.intensity,
          })
          if (currentPath !== inputPath) needsCleanup.push(currentPath)
          currentPath = ugcOutputPath
          console.log(`[Variant] Applied UGC effects`)
        }

        // 字幕追加
        const needsSubtitles = (variantConfig as { subtitles?: boolean | { entries: unknown[] } }).subtitles
        if (needsSubtitles && subtitleEntries) {
          const subtitleOutputPath = path.join(tempDir, `variant_${i}_sub.mp4`)
          await burnSubtitles({
            inputPath: currentPath,
            outputPath: subtitleOutputPath,
            subtitles: subtitleEntries,
          })
          if (currentPath !== inputPath) needsCleanup.push(currentPath)
          currentPath = subtitleOutputPath
          console.log(`[Variant] Added subtitles`)
        }

        // プラットフォーム最適化
        if (variantConfig.platform) {
          const platformOutputPath = path.join(tempDir, `variant_${i}_platform.mp4`)
          await convertForPlatform(currentPath, platformOutputPath, variantConfig.platform)
          if (currentPath !== inputPath) needsCleanup.push(currentPath)
          currentPath = platformOutputPath
          console.log(`[Variant] Optimized for ${variantConfig.platform}`)
        }

        // 最終出力パス
        const finalOutputPath = path.join(tempDir, `variant_${i}_final.mp4`)
        if (currentPath !== finalOutputPath) {
          fs.copyFileSync(currentPath, finalOutputPath)
        }

        // アップロード
        await updateVideoProgress(variantId, 80 + (i * 15 / variants.length), 'アップロード中...')
        const videoUrl = await uploadToStorage(finalOutputPath, variantId, userId)

        // 完了
        await updateVideoStatus(variantId, 'ready', {
          remote_url: videoUrl,
          duration_seconds: duration,
          progress: 100,
          progress_message: '生成完了',
        })

        console.log(`[Variant] Variant ${i + 1} completed: ${variantConfig.name}`)

        // 中間ファイルクリーンアップ
        for (const p of needsCleanup) {
          try { fs.unlinkSync(p) } catch {}
        }

      } catch (variantError) {
        console.error(`[Variant] Failed to process variant ${i + 1}:`, variantError)
        await updateVideoStatus(variantId, 'failed', {
          progress: 0,
          progress_message: '生成に失敗しました',
        })
      }
    }

    console.log(`[Variant] Job ${job.id} completed!`)
    return { success: true, sourceVideoId, variantIds }

  } catch (error) {
    console.error(`[Variant] Job ${job.id} failed:`, error)
    // 全バリアントを失敗に
    for (const variantId of variantIds) {
      await updateVideoStatus(variantId, 'failed', {
        progress: 0,
        progress_message: '生成に失敗しました',
      })
    }
    throw error
  } finally {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true })
      }
    } catch (e) {
      console.warn(`[Variant] Failed to cleanup: ${tempDir}`)
    }
  }
}

const variantWorker = new Worker('video-variants', processVariantJob, {
  connection,
  concurrency: 1, // FFmpeg処理のため同時実行数を制限
})

variantWorker.on('ready', () => {
  console.log('[Variant] Worker is ready')
})

variantWorker.on('completed', (job) => {
  console.log(`[Variant] Job ${job.id} completed`)
})

variantWorker.on('failed', (job, error) => {
  console.error(`[Variant] Job ${job?.id} failed:`, error.message)
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Worker] Shutting down...')
  await worker.close()
  await pipelineWorker.close()
  await variantWorker.close()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('[Worker] Shutting down...')
  await worker.close()
  await pipelineWorker.close()
  await variantWorker.close()
  process.exit(0)
})
