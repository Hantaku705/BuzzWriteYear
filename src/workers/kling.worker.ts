/**
 * Kling AI 動画生成ワーカー
 *
 * BullMQジョブを処理し、Kling APIで動画を生成
 */

import { Job } from 'bullmq'
import { createClient } from '@supabase/supabase-js'
import {
  createWorker,
  QUEUE_NAMES,
  KlingJobData,
} from '@/lib/queue/client'
import {
  generateVideo,
  waitForCompletion,
  downloadVideo,
} from '@/lib/video/kling/client'
import { getPreset } from '@/lib/video/kling/prompts'
import path from 'path'
import fs from 'fs'
import os from 'os'

// Supabaseクライアント（サービスロール）
const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase environment variables not set')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

// 動画をSupabase Storageにアップロード
async function uploadToStorage(
  localPath: string,
  videoId: string,
  userId: string
): Promise<string> {
  const supabase = getSupabaseAdmin()
  const fileBuffer = fs.readFileSync(localPath)
  const fileName = `${userId}/${videoId}.mp4`

  const { error } = await supabase.storage
    .from('videos')
    .upload(fileName, fileBuffer, {
      contentType: 'video/mp4',
      upsert: true,
    })

  if (error) {
    throw new Error(`Failed to upload video to storage: ${error.message}`)
  }

  // 公開URLを取得
  const { data: urlData } = supabase.storage
    .from('videos')
    .getPublicUrl(fileName)

  return urlData.publicUrl
}

// ビデオステータスを更新
async function updateVideoStatus(
  videoId: string,
  status: 'generating' | 'ready' | 'failed',
  updates: {
    remote_url?: string
    duration_seconds?: number
    local_path?: string
  } = {}
) {
  const supabase = getSupabaseAdmin()

  const { error } = await supabase
    .from('videos')
    .update({
      status,
      ...updates,
    } as never)
    .eq('id', videoId)

  if (error) {
    console.error(`Failed to update video status: ${error.message}`)
  }
}

// ジョブ処理関数
async function processKlingJob(job: Job<KlingJobData>) {
  const {
    videoId,
    userId,
    mode,
    imageUrl,
    prompt,
    negativePrompt,
    duration,
    presetId,
  } = job.data

  console.log(`[Kling Worker] Starting job ${job.id} for video ${videoId}`)

  try {
    // ステータスを生成中に更新
    await updateVideoStatus(videoId, 'generating')

    // プリセットからネガティブプロンプトを取得
    const preset = presetId ? getPreset(presetId) : undefined
    const finalNegativePrompt =
      negativePrompt || preset?.negativePrompt || 'blurry, low quality, distorted'

    // Kling APIで動画生成を開始
    console.log(`[Kling Worker] Calling Kling API - mode: ${mode}`)
    const taskResponse = await generateVideo({
      mode,
      prompt,
      imageUrl,
      negativePrompt: finalNegativePrompt,
      duration,
      aspectRatio: '9:16', // TikTok縦型
    })

    console.log(`[Kling Worker] Task created: ${taskResponse.task_id}`)

    // 生成完了まで待機
    const result = await waitForCompletion(taskResponse.task_id, {
      maxAttempts: 60, // 最大10分
      pollInterval: 10000, // 10秒間隔
      onProgress: (status) => {
        console.log(
          `[Kling Worker] Task ${taskResponse.task_id} progress: ${status.progress || 0}%`
        )
      },
    })

    if (!result.video_url) {
      throw new Error('Video URL not found in completed task')
    }

    console.log(`[Kling Worker] Video generated: ${result.video_url}`)

    // 一時ファイルにダウンロード
    const tempDir = os.tmpdir()
    const tempPath = path.join(tempDir, `kling-${videoId}.mp4`)
    await downloadVideo(result.video_url, tempPath)

    // Supabase Storageにアップロード
    const publicUrl = await uploadToStorage(tempPath, videoId, userId)

    // 一時ファイルを削除
    fs.unlinkSync(tempPath)

    // ステータスを完了に更新
    await updateVideoStatus(videoId, 'ready', {
      remote_url: publicUrl,
      duration_seconds: duration,
    })

    console.log(`[Kling Worker] Job ${job.id} completed successfully`)

    return {
      success: true,
      videoId,
      videoUrl: publicUrl,
    }
  } catch (error) {
    console.error(`[Kling Worker] Job ${job.id} failed:`, error)

    // ステータスを失敗に更新
    await updateVideoStatus(videoId, 'failed')

    throw error
  }
}

// ワーカーを作成・開始
export function startKlingWorker() {
  console.log('[Kling Worker] Starting worker...')
  return createWorker<KlingJobData>(
    QUEUE_NAMES.KLING_GENERATION,
    processKlingJob
  )
}

// メインエントリーポイント（直接実行時）
if (require.main === module) {
  startKlingWorker()
  console.log('[Kling Worker] Worker started and listening for jobs')
}
