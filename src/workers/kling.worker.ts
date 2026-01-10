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
  status: 'generating' | 'ready' | 'failed' | 'cancelled',
  updates: {
    remote_url?: string
    duration_seconds?: number
    local_path?: string
    progress?: number
    progress_message?: string
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

// 進捗のみを更新
async function updateVideoProgress(
  videoId: string,
  progress: number,
  message: string
) {
  const supabase = getSupabaseAdmin()

  const { error } = await supabase
    .from('videos')
    .update({
      progress,
      progress_message: message,
    } as never)
    .eq('id', videoId)

  if (error) {
    console.error(`Failed to update video progress: ${error.message}`)
  }
}

// キャンセル状態をチェック
async function checkIfCancelled(videoId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('videos')
    .select('status')
    .eq('id', videoId)
    .single()

  if (error || !data) {
    return false
  }

  return data.status === 'cancelled'
}

// 進捗ステージに応じたメッセージを取得
function getProgressMessage(progress: number): string {
  if (progress < 10) return 'リクエストを送信中...'
  if (progress < 30) return 'AI処理待機中...'
  if (progress < 80) return '動画を生成中...'
  if (progress < 95) return '動画をレンダリング中...'
  return 'アップロード中...'
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
    // キャンセル済みかチェック
    if (await checkIfCancelled(videoId)) {
      console.log(`[Kling Worker] Job ${job.id} was cancelled before starting`)
      return { success: false, cancelled: true }
    }

    // ステータスを生成中に更新
    await updateVideoStatus(videoId, 'generating', {
      progress: 5,
      progress_message: 'リクエストを送信中...',
    })

    // プリセットからネガティブプロンプトを取得
    const preset = presetId ? getPreset(presetId) : undefined
    const finalNegativePrompt =
      negativePrompt || preset?.negativePrompt || 'blurry, low quality, distorted'

    // Kling APIで動画生成を開始
    console.log(`[Kling Worker] Calling Kling API - mode: ${mode}`)
    await updateVideoProgress(videoId, 10, 'AI処理待機中...')

    const taskResponse = await generateVideo({
      mode,
      prompt,
      imageUrl,
      negativePrompt: finalNegativePrompt,
      duration,
      aspectRatio: '9:16', // TikTok縦型
    })

    console.log(`[Kling Worker] Task created: ${taskResponse.task_id}`)

    // 生成完了まで待機（進捗をDBに保存）
    const result = await waitForCompletion(taskResponse.task_id, {
      maxAttempts: 60, // 最大10分
      pollInterval: 10000, // 10秒間隔
      onProgress: async (status) => {
        // キャンセルチェック
        if (await checkIfCancelled(videoId)) {
          console.log(`[Kling Worker] Job ${job.id} was cancelled during generation`)
          throw new Error('CANCELLED')
        }

        // 進捗を計算（10-85%の範囲でマッピング）
        const apiProgress = status.progress || 0
        const mappedProgress = Math.min(10 + Math.floor(apiProgress * 0.75), 85)
        const message = getProgressMessage(mappedProgress)

        console.log(
          `[Kling Worker] Task ${taskResponse.task_id} progress: ${apiProgress}% (mapped: ${mappedProgress}%)`
        )

        await updateVideoProgress(videoId, mappedProgress, message)
      },
    })

    // キャンセル済みかチェック
    if (await checkIfCancelled(videoId)) {
      console.log(`[Kling Worker] Job ${job.id} was cancelled after generation`)
      return { success: false, cancelled: true }
    }

    if (!result.video_url) {
      throw new Error('Video URL not found in completed task')
    }

    console.log(`[Kling Worker] Video generated: ${result.video_url}`)
    await updateVideoProgress(videoId, 90, '動画をダウンロード中...')

    // 一時ファイルにダウンロード
    const tempDir = os.tmpdir()
    const tempPath = path.join(tempDir, `kling-${videoId}.mp4`)
    await downloadVideo(result.video_url, tempPath)

    await updateVideoProgress(videoId, 95, 'アップロード中...')

    // Supabase Storageにアップロード
    const publicUrl = await uploadToStorage(tempPath, videoId, userId)

    // 一時ファイルを削除
    fs.unlinkSync(tempPath)

    // ステータスを完了に更新
    await updateVideoStatus(videoId, 'ready', {
      remote_url: publicUrl,
      duration_seconds: duration,
      progress: 100,
      progress_message: '生成完了',
    })

    console.log(`[Kling Worker] Job ${job.id} completed successfully`)

    return {
      success: true,
      videoId,
      videoUrl: publicUrl,
    }
  } catch (error) {
    // キャンセルの場合は例外を投げない
    if (error instanceof Error && error.message === 'CANCELLED') {
      return { success: false, cancelled: true }
    }

    console.error(`[Kling Worker] Job ${job.id} failed:`, error)

    // ステータスを失敗に更新
    await updateVideoStatus(videoId, 'failed', {
      progress: 0,
      progress_message: '生成に失敗しました',
    })

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
