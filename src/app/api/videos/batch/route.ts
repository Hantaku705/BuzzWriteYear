import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { addBatchJob } from '@/lib/queue/client'
import type {
  BatchJobItem,
  CreateBatchResponse,
  BatchStatusResponse,
} from '@/types/batch'

// HeyGen設定スキーマ
const heygenConfigSchema = z.object({
  type: z.literal('heygen'),
  avatarId: z.string().min(1),
  voiceId: z.string().optional(),
  backgroundUrl: z.string().url().optional(),
})

// Kling設定スキーマ
const klingConfigSchema = z.object({
  type: z.literal('kling'),
  modelVersion: z.enum(['1.5', '1.6', '2.1', '2.5', '2.6']),
  aspectRatio: z.enum(['16:9', '9:16', '1:1']),
  quality: z.enum(['standard', 'pro']),
  duration: z.union([z.literal(5), z.literal(10)]),
  enableAudio: z.boolean().optional(),
})

// バッチアイテムスキーマ
const batchItemSchema = z.object({
  title: z.string().optional(),
  script: z.string().optional(),
  prompt: z.string().optional(),
  imageUrl: z.string().url().optional(),
  productId: z.string().uuid().optional(),
})

// バッチ作成リクエストスキーマ
const createBatchSchema = z.object({
  type: z.enum(['heygen', 'kling']),
  name: z.string().max(200).optional(),
  config: z.union([heygenConfigSchema, klingConfigSchema]),
  items: z.array(batchItemSchema).min(1).max(100),
})

// POST: バッチジョブ作成
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // リクエストボディをパース
    const body = await request.json()
    const parseResult = createBatchSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.issues },
        { status: 400 }
      )
    }

    const { type, name, config, items } = parseResult.data

    // バリデーション: HeyGenはscript必須、KlingはpromptまたはimageUrl必須
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (type === 'heygen' && !item.script) {
        return NextResponse.json(
          { error: `Row ${i + 1}: script is required for HeyGen` },
          { status: 400 }
        )
      }
      if (type === 'kling' && !item.prompt && !item.imageUrl) {
        return NextResponse.json(
          { error: `Row ${i + 1}: prompt or imageUrl is required for Kling` },
          { status: 400 }
        )
      }
    }

    // batch_jobsレコード作成
    const { data: batchJob, error: batchError } = await supabase
      .from('batch_jobs')
      .insert({
        user_id: user.id,
        type,
        name: name || `バッチ生成 ${new Date().toLocaleString('ja-JP')}`,
        status: 'pending',
        total_count: items.length,
        completed_count: 0,
        failed_count: 0,
        config,
      } as never)
      .select('id')
      .single()

    type BatchJobRow = { id: string }
    const batchJobData = batchJob as BatchJobRow | null

    if (batchError || !batchJobData) {
      console.error('Failed to create batch job:', batchError)
      return NextResponse.json(
        { error: 'Failed to create batch job' },
        { status: 500 }
      )
    }

    // batch_job_itemsレコード作成
    const itemInserts = items.map((item, index) => ({
      batch_job_id: batchJobData.id,
      status: 'pending',
      item_index: index,
      config: item,
    }))

    const { error: itemsError } = await supabase
      .from('batch_job_items')
      .insert(itemInserts as never)

    if (itemsError) {
      console.error('Failed to create batch job items:', itemsError)
      // バッチジョブも削除
      await supabase.from('batch_jobs').delete().eq('id', batchJobData.id)
      return NextResponse.json(
        { error: 'Failed to create batch job items' },
        { status: 500 }
      )
    }

    // バッチジョブを開始（ステータスをprocessingに更新し、ワーカーをトリガー）
    await supabase
      .from('batch_jobs')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
      } as never)
      .eq('id', batchJobData.id)

    // BullMQキューにジョブ追加
    await addBatchJob({
      batchJobId: batchJobData.id,
      userId: user.id,
      type,
      config,
    })

    const response: CreateBatchResponse = {
      batchJob: {
        id: batchJobData.id,
        totalCount: items.length,
        status: 'processing',
      },
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Batch create error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET: バッチジョブ一覧またはステータス取得
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const batchId = searchParams.get('id')

    // 特定のバッチジョブ詳細
    if (batchId) {
      const { data: batchJob, error: batchError } = await supabase
        .from('batch_jobs')
        .select('*')
        .eq('id', batchId)
        .eq('user_id', user.id)
        .single()

      type BatchJobRow = {
        id: string
        type: string
        name: string | null
        status: string
        total_count: number
        completed_count: number
        failed_count: number
        config: unknown
        created_at: string
        started_at: string | null
        completed_at: string | null
      }
      const batchJobData = batchJob as BatchJobRow | null

      if (batchError || !batchJobData) {
        return NextResponse.json(
          { error: 'Batch job not found' },
          { status: 404 }
        )
      }

      // アイテム一覧取得
      const { data: items, error: itemsError } = await supabase
        .from('batch_job_items')
        .select('*')
        .eq('batch_job_id', batchId)
        .order('item_index', { ascending: true })

      type BatchJobItemRow = {
        id: string
        batch_job_id: string
        video_id: string | null
        status: string
        item_index: number
        config: unknown
        error_message: string | null
        created_at: string
        completed_at: string | null
      }
      const itemsData = (items as BatchJobItemRow[] | null) ?? []

      const progress = batchJobData.total_count > 0
        ? Math.round(((batchJobData.completed_count + batchJobData.failed_count) / batchJobData.total_count) * 100)
        : 0

      const response: BatchStatusResponse = {
        id: batchJobData.id,
        type: batchJobData.type as 'heygen' | 'kling',
        name: batchJobData.name,
        status: batchJobData.status as BatchStatusResponse['status'],
        totalCount: batchJobData.total_count,
        completedCount: batchJobData.completed_count,
        failedCount: batchJobData.failed_count,
        progress,
        items: itemsData as BatchJobItem[],
        createdAt: batchJobData.created_at,
        startedAt: batchJobData.started_at,
        completedAt: batchJobData.completed_at,
      }

      return NextResponse.json(response)
    }

    // バッチジョブ一覧
    const { data: batchJobs, error: listError } = await supabase
      .from('batch_jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    type BatchJobListRow = {
      id: string
      type: string
      name: string | null
      status: string
      total_count: number
      completed_count: number
      failed_count: number
      config: unknown
      created_at: string
      started_at: string | null
      completed_at: string | null
    }
    const batchJobsData = (batchJobs as BatchJobListRow[] | null) ?? []

    if (listError) {
      console.error('Failed to fetch batch jobs:', listError)
      return NextResponse.json(
        { error: 'Failed to fetch batch jobs' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      batchJobs: batchJobsData.map((job) => ({
        id: job.id,
        type: job.type,
        name: job.name,
        status: job.status,
        totalCount: job.total_count,
        completedCount: job.completed_count,
        failedCount: job.failed_count,
        progress: job.total_count > 0
          ? Math.round(((job.completed_count + job.failed_count) / job.total_count) * 100)
          : 0,
        createdAt: job.created_at,
      })),
    })
  } catch (error) {
    console.error('Batch list error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
