import { Job } from 'bullmq'
import { createClient } from '@supabase/supabase-js'
import {
  createWorker,
  QUEUE_NAMES,
  BatchJobData,
  addHeyGenJob,
  addKlingJob,
} from '@/lib/queue/client'

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

// バッチジョブのアイテム型
interface BatchJobItem {
  id: string
  batch_job_id: string
  video_id: string | null
  status: string
  item_index: number
  config: {
    title?: string
    script?: string
    prompt?: string
    imageUrl?: string
    productId?: string
  }
  error_message: string | null
}

// バッチジョブ更新
async function updateBatchProgress(
  batchJobId: string,
  updates: {
    completedCount?: number
    failedCount?: number
    status?: string
  }
) {
  const supabase = getServiceSupabase()
  const updateData: Record<string, unknown> = {}

  if (updates.completedCount !== undefined) {
    updateData.completed_count = updates.completedCount
  }
  if (updates.failedCount !== undefined) {
    updateData.failed_count = updates.failedCount
  }
  if (updates.status) {
    updateData.status = updates.status
    if (updates.status === 'completed' || updates.status === 'failed') {
      updateData.completed_at = new Date().toISOString()
    }
  }

  await supabase
    .from('batch_jobs')
    .update(updateData as never)
    .eq('id', batchJobId)
}

// アイテムステータス更新
async function updateItemStatus(
  itemId: string,
  status: string,
  videoId?: string,
  errorMessage?: string
) {
  const supabase = getServiceSupabase()
  const updateData: Record<string, unknown> = { status }

  if (videoId) {
    updateData.video_id = videoId
  }
  if (errorMessage) {
    updateData.error_message = errorMessage
  }
  if (status === 'completed' || status === 'failed') {
    updateData.completed_at = new Date().toISOString()
  }

  await supabase
    .from('batch_job_items')
    .update(updateData as never)
    .eq('id', itemId)
}

// HeyGenバッチアイテム処理
async function processHeyGenItem(
  item: BatchJobItem,
  config: {
    avatarId: string
    voiceId?: string
    backgroundUrl?: string
  },
  userId: string
): Promise<string> {
  const supabase = getServiceSupabase()

  // 動画レコード作成
  const { data: video, error: videoError } = await supabase
    .from('videos')
    .insert({
      user_id: userId,
      product_id: item.config.productId || null,
      title: item.config.title || `HeyGen バッチ #${item.item_index + 1}`,
      status: 'generating',
      generation_type: 'heygen',
      progress: 0,
      progress_message: 'バッチ処理待機中...',
    } as never)
    .select('id')
    .single()

  if (videoError || !video) {
    throw new Error(`Failed to create video record: ${videoError?.message}`)
  }

  const videoId = (video as { id: string }).id

  // HeyGenジョブ追加
  await addHeyGenJob({
    videoId,
    userId,
    avatarId: config.avatarId,
    script: item.config.script || '',
    voiceId: config.voiceId,
    backgroundUrl: config.backgroundUrl,
  })

  return videoId
}

// Klingバッチアイテム処理
async function processKlingItem(
  item: BatchJobItem,
  config: {
    modelVersion: '1.5' | '1.6' | '2.1' | '2.5' | '2.6'
    aspectRatio: '16:9' | '9:16' | '1:1'
    quality: 'standard' | 'pro'
    duration: 5 | 10
    enableAudio?: boolean
  },
  userId: string
): Promise<string> {
  const supabase = getServiceSupabase()

  // 動画レコード作成
  const { data: video, error: videoError } = await supabase
    .from('videos')
    .insert({
      user_id: userId,
      product_id: item.config.productId || null,
      title: item.config.title || `Kling バッチ #${item.item_index + 1}`,
      status: 'generating',
      generation_type: 'kling',
      progress: 0,
      progress_message: 'バッチ処理待機中...',
    } as never)
    .select('id')
    .single()

  if (videoError || !video) {
    throw new Error(`Failed to create video record: ${videoError?.message}`)
  }

  const videoId = (video as { id: string }).id

  // Klingジョブ追加
  await addKlingJob({
    videoId,
    userId,
    mode: item.config.imageUrl ? 'image-to-video' : 'text-to-video',
    imageUrl: item.config.imageUrl,
    prompt: item.config.prompt || '',
    duration: config.duration,
    modelVersion: config.modelVersion,
    aspectRatio: config.aspectRatio,
    quality: config.quality,
    enableAudio: config.enableAudio,
  })

  return videoId
}

// バッチ処理メイン
async function processBatchJob(
  job: Job<BatchJobData>
): Promise<{ completedCount: number; failedCount: number }> {
  const { batchJobId, userId, type, config } = job.data
  const supabase = getServiceSupabase()

  console.log(`[Batch Worker] Starting batch job ${batchJobId} (type: ${type})`)

  // バッチアイテム取得
  const { data: items, error: itemsError } = await supabase
    .from('batch_job_items')
    .select('*')
    .eq('batch_job_id', batchJobId)
    .eq('status', 'pending')
    .order('item_index', { ascending: true })

  if (itemsError || !items) {
    throw new Error(`Failed to fetch batch items: ${itemsError?.message}`)
  }

  const batchItems = items as BatchJobItem[]
  console.log(`[Batch Worker] Processing ${batchItems.length} items`)

  let completedCount = 0
  let failedCount = 0

  // 各アイテムを処理
  for (const item of batchItems) {
    try {
      await updateItemStatus(item.id, 'processing')

      let videoId: string

      if (type === 'heygen') {
        const heygenConfig = config as {
          avatarId: string
          voiceId?: string
          backgroundUrl?: string
        }
        videoId = await processHeyGenItem(item, heygenConfig, userId)
      } else {
        const klingConfig = config as {
          modelVersion: '1.5' | '1.6' | '2.1' | '2.5' | '2.6'
          aspectRatio: '16:9' | '9:16' | '1:1'
          quality: 'standard' | 'pro'
          duration: 5 | 10
          enableAudio?: boolean
        }
        videoId = await processKlingItem(item, klingConfig, userId)
      }

      await updateItemStatus(item.id, 'completed', videoId)
      completedCount++

      console.log(`[Batch Worker] Item ${item.item_index + 1} queued with video ${videoId}`)
    } catch (error) {
      console.error(`[Batch Worker] Item ${item.item_index + 1} failed:`, error)

      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      await updateItemStatus(item.id, 'failed', undefined, errorMessage)
      failedCount++
    }

    // バッチ進捗更新
    await updateBatchProgress(batchJobId, { completedCount, failedCount })

    // ジョブ進捗更新
    const progress = Math.round(((completedCount + failedCount) / batchItems.length) * 100)
    await job.updateProgress(progress)
  }

  // 最終ステータス更新
  const finalStatus = failedCount === batchItems.length ? 'failed' : 'completed'
  await updateBatchProgress(batchJobId, { status: finalStatus })

  console.log(`[Batch Worker] Batch ${batchJobId} finished: ${completedCount} completed, ${failedCount} failed`)

  return { completedCount, failedCount }
}

// ワーカー起動
export function startBatchWorker() {
  const worker = createWorker<BatchJobData>(
    QUEUE_NAMES.BATCH_GENERATION,
    async (job) => {
      return await processBatchJob(job)
    }
  )

  worker.on('completed', (job, result) => {
    console.log(`[Batch Worker] Job ${job.id} completed:`, result)
  })

  worker.on('failed', (job, error) => {
    console.error(`[Batch Worker] Job ${job?.id} failed:`, error)
  })

  worker.on('progress', (job, progress) => {
    console.log(`[Batch Worker] Job ${job.id} progress: ${progress}%`)
  })

  console.log('[Batch Worker] Worker started')

  return worker
}

// スタンドアロン実行用
if (require.main === module) {
  startBatchWorker()
}
