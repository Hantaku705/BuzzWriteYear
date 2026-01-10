import { Job } from 'bullmq'
import { createClient } from '@supabase/supabase-js'
import path from 'path'
import fs from 'fs'
import os from 'os'
import {
  createWorker,
  QUEUE_NAMES,
  PipelineJobData,
} from '@/lib/queue/client'
import {
  runVideoPipeline,
  createTikTokUGCPipeline,
  createReviewPipeline,
  createSimpleOptimizePipeline,
  PipelineConfig,
  PipelineStage,
} from '@/lib/video/pipeline'
import { UGCEffect } from '@/lib/video/ffmpeg'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * 進捗更新ヘルパー
 */
async function updateProgress(
  videoId: string,
  stage: PipelineStage,
  progress: number,
  message: string
) {
  const statusMap: Record<PipelineStage, string> = {
    init: 'processing',
    ugc_effects: 'processing',
    trim: 'processing',
    merge: 'processing',
    subtitles: 'processing',
    optimize: 'processing',
    thumbnail: 'processing',
    upload: 'processing',
    complete: 'completed',
    error: 'failed',
  }

  await supabase
    .from('videos')
    .update({
      status: statusMap[stage] || 'processing',
      progress,
      progress_message: message,
    })
    .eq('id', videoId)
}

/**
 * リモートURLから動画をダウンロード
 */
async function downloadVideo(url: string, outputPath: string): Promise<void> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.status}`)
  }

  const buffer = await response.arrayBuffer()
  fs.writeFileSync(outputPath, Buffer.from(buffer))
}

/**
 * 動画をSupabase Storageにアップロード
 */
async function uploadToStorage(
  localPath: string,
  userId: string,
  type: 'video' | 'thumbnail'
): Promise<string> {
  const ext = type === 'video' ? 'mp4' : 'jpg'
  const bucket = type === 'video' ? 'videos' : 'thumbnails'
  const fileName = `${userId}/${Date.now()}-pipeline.${ext}`

  const fileBuffer = fs.readFileSync(localPath)
  const contentType = type === 'video' ? 'video/mp4' : 'image/jpeg'

  const { error } = await supabase.storage
    .from(bucket)
    .upload(fileName, fileBuffer, {
      contentType,
      cacheControl: '31536000',
    })

  if (error) {
    throw new Error(`Upload failed: ${error.message}`)
  }

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName)

  return publicUrl
}

/**
 * プリセットからパイプライン設定を生成
 */
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

/**
 * パイプラインワーカー処理
 */
async function processPipelineJob(job: Job<PipelineJobData>) {
  const { videoId, userId, sourceUrl, preset, config } = job.data
  const tempDir = path.join(os.tmpdir(), `pipeline_${videoId}`)

  try {
    console.log(`[Pipeline Worker] Starting job ${job.id} for video ${videoId}`)

    // 一時ディレクトリ作成
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }

    // Step 1: 動画をダウンロード
    await updateProgress(videoId, 'init', 5, '動画をダウンロード中...')
    const inputPath = path.join(tempDir, 'input.mp4')
    await downloadVideo(sourceUrl, inputPath)
    console.log(`[Pipeline Worker] Downloaded video to ${inputPath}`)

    // Step 2: パイプライン設定を生成
    const pipelineConfig = createPipelineFromPreset(inputPath, preset, config)
    pipelineConfig.outputDir = tempDir
    pipelineConfig.onProgress = async (stage, progress, message) => {
      await updateProgress(videoId, stage, progress, message)
    }

    // Step 3: パイプライン実行
    console.log(`[Pipeline Worker] Running pipeline with preset: ${preset}`)
    const result = await runVideoPipeline(pipelineConfig)

    if (!result.success) {
      throw new Error(result.error || 'Pipeline failed')
    }

    // Step 4: 結果をSupabase Storageにアップロード
    await updateProgress(videoId, 'upload', 90, '処理済み動画をアップロード中...')

    const videoUrl = await uploadToStorage(result.outputPath, userId, 'video')
    console.log(`[Pipeline Worker] Uploaded video to ${videoUrl}`)

    let thumbnailUrl: string | undefined
    if (result.thumbnailPath && fs.existsSync(result.thumbnailPath)) {
      thumbnailUrl = await uploadToStorage(result.thumbnailPath, userId, 'thumbnail')
      console.log(`[Pipeline Worker] Uploaded thumbnail to ${thumbnailUrl}`)
    }

    // Step 5: データベース更新
    await supabase
      .from('videos')
      .update({
        status: 'completed',
        progress: 100,
        progress_message: '処理が完了しました',
        remote_url: videoUrl,
        thumbnail_url: thumbnailUrl,
        duration: Math.round(result.metadata.duration),
        metadata: {
          width: result.metadata.width,
          height: result.metadata.height,
          fileSize: result.metadata.fileSize,
          codec: result.metadata.codec,
          pipeline: {
            preset,
            stages: result.stages,
          },
        },
      })
      .eq('id', videoId)

    console.log(`[Pipeline Worker] Job ${job.id} completed successfully`)

    return {
      success: true,
      videoId,
      outputUrl: videoUrl,
      thumbnailUrl,
    }
  } catch (error) {
    console.error(`[Pipeline Worker] Job ${job.id} failed:`, error)

    await supabase
      .from('videos')
      .update({
        status: 'failed',
        progress: 0,
        progress_message: `エラー: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
      .eq('id', videoId)

    throw error
  } finally {
    // クリーンアップ
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true })
      }
    } catch (e) {
      console.warn(`[Pipeline Worker] Failed to cleanup temp dir: ${tempDir}`)
    }
  }
}

// ワーカーをエクスポート
export const pipelineWorker = createWorker<PipelineJobData>(
  QUEUE_NAMES.VIDEO_PIPELINE,
  processPipelineJob
)

// イベントリスナー
pipelineWorker.on('completed', (job) => {
  console.log(`[Pipeline Worker] Job ${job.id} completed`)
})

pipelineWorker.on('failed', (job, error) => {
  console.error(`[Pipeline Worker] Job ${job?.id} failed:`, error.message)
})

pipelineWorker.on('progress', (job, progress) => {
  console.log(`[Pipeline Worker] Job ${job.id} progress: ${progress}%`)
})

console.log('[Pipeline Worker] Worker started and listening for jobs')
