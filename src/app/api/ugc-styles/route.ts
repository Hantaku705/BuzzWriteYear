/**
 * UGCスタイル API
 * GET: スタイル一覧取得
 * POST: 新規スタイル作成（分析開始）
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { addUGCStyleAnalysisJob } from '@/lib/queue/client'
import { processVideoInputs } from '@/lib/ugc-style/downloader'
import { z } from 'zod'

// リクエストバリデーション
const createStyleSchema = z.object({
  name: z.string().min(1, '名前は必須です').max(255),
  description: z.string().optional(),
  /** TikTok URL、直接URL、アップロード済みURLの配列 */
  sampleUrls: z.array(z.string().url()).min(5, '最低5本の動画が必要です'),
})

/**
 * GET /api/ugc-styles
 * ユーザーのUGCスタイル一覧を取得
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // ユーザー認証確認
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // スタイル一覧取得
    const { data: styles, error } = await supabase
      .from('ugc_styles')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ styles })
  } catch (error) {
    console.error('Failed to fetch UGC styles:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'スタイルの取得に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/ugc-styles
 * 新規UGCスタイルを作成して分析を開始
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // ユーザー認証確認
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // リクエストボディをパース
    const body = await request.json()
    const validation = createStyleSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    const { name, description, sampleUrls } = validation.data

    // スタイルレコード作成
    const { data: style, error: styleError } = await supabase
      .from('ugc_styles')
      .insert({
        user_id: user.id,
        name,
        description: description || null,
        status: 'analyzing',
        sample_count: sampleUrls.length,
      } as never)
      .select('id')
      .single()

    if (styleError || !style) {
      throw new Error(styleError?.message || 'スタイルの作成に失敗しました')
    }

    const styleId = (style as { id: string }).id

    // 動画入力を処理（TikTok URL、直接URL対応）
    const processedVideos = await processVideoInputs(sampleUrls, user.id, styleId)

    // サンプルレコード作成
    const sampleRecords = processedVideos.map((video, index) => ({
      ugc_style_id: styleId,
      video_url: video.storageUrl,
      filename: video.filename,
      file_size_bytes: video.fileSize || null,
      analysis_status: 'pending',
    }))

    const { data: samples, error: samplesError } = await supabase
      .from('ugc_style_samples')
      .insert(sampleRecords as never)
      .select('id')

    if (samplesError || !samples) {
      // スタイルを削除してロールバック
      await supabase.from('ugc_styles').delete().eq('id', styleId)
      throw new Error(samplesError?.message || 'サンプルの作成に失敗しました')
    }

    const sampleIds = (samples as { id: string }[]).map(s => s.id)

    // 分析ジョブをキューに追加
    await addUGCStyleAnalysisJob({
      styleId,
      userId: user.id,
      sampleIds,
      phase: 'analyze-samples',
    })

    // 推定時間を計算（1動画あたり約30秒）
    const estimatedTime = Math.ceil(sampleUrls.length * 30)

    return NextResponse.json({
      id: styleId,
      status: 'analyzing',
      sampleCount: sampleUrls.length,
      estimatedTime,
    })
  } catch (error) {
    console.error('Failed to create UGC style:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'スタイルの作成に失敗しました' },
      { status: 500 }
    )
  }
}
