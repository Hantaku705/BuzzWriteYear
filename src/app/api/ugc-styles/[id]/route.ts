/**
 * UGCスタイル詳細 API
 * GET: スタイル詳細取得（サンプル含む）
 * PATCH: スタイル更新（名前・説明のみ）
 * DELETE: スタイル削除
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// 更新リクエストバリデーション
const updateStyleSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
})

/**
 * GET /api/ugc-styles/[id]
 * スタイル詳細とサンプル一覧を取得
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // ユーザー認証確認
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // スタイル取得
    const { data: style, error: styleError } = await supabase
      .from('ugc_styles')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (styleError || !style) {
      return NextResponse.json({ error: 'スタイルが見つかりません' }, { status: 404 })
    }

    // サンプル取得
    const { data: samples, error: samplesError } = await supabase
      .from('ugc_style_samples')
      .select('*')
      .eq('ugc_style_id', id)
      .order('created_at', { ascending: true })

    if (samplesError) {
      throw new Error(samplesError.message)
    }

    // 進捗計算
    const completedCount = (samples || []).filter(
      s => (s as { analysis_status: string }).analysis_status === 'completed'
    ).length
    const totalCount = (samples || []).length
    const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

    return NextResponse.json({
      ...(style as Record<string, unknown>),
      samples: samples || [],
      progress,
    })
  } catch (error) {
    console.error('Failed to fetch UGC style:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'スタイルの取得に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/ugc-styles/[id]
 * スタイルの名前・説明を更新
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // ユーザー認証確認
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // リクエストボディをパース
    const body = await request.json()
    const validation = updateStyleSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    // 所有者確認
    const { data: existing, error: existingError } = await supabase
      .from('ugc_styles')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (existingError || !existing) {
      return NextResponse.json({ error: 'スタイルが見つかりません' }, { status: 404 })
    }

    // 更新
    const updateData: Record<string, unknown> = {}
    if (validation.data.name) updateData.name = validation.data.name
    if (validation.data.description !== undefined) {
      updateData.description = validation.data.description || null
    }

    const { data: updated, error: updateError } = await supabase
      .from('ugc_styles')
      .update(updateData as never)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      throw new Error(updateError.message)
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Failed to update UGC style:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'スタイルの更新に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/ugc-styles/[id]
 * スタイルとサンプルを削除
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // ユーザー認証確認
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // 所有者確認
    const { data: existing, error: existingError } = await supabase
      .from('ugc_styles')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (existingError || !existing) {
      return NextResponse.json({ error: 'スタイルが見つかりません' }, { status: 404 })
    }

    // サンプル動画をStorageから削除
    const { data: samples } = await supabase
      .from('ugc_style_samples')
      .select('video_url')
      .eq('ugc_style_id', id)

    if (samples && samples.length > 0) {
      // Supabase Storage内のファイルパスを抽出して削除
      const filePaths = samples
        .map(s => {
          const url = (s as { video_url: string }).video_url
          // URLからパスを抽出（ugc-styles/userId/styleId/filename形式）
          const match = url.match(/videos\/(.+)$/)
          return match ? match[1] : null
        })
        .filter(Boolean) as string[]

      if (filePaths.length > 0) {
        await supabase.storage.from('videos').remove(filePaths)
      }
    }

    // スタイル削除（CASCADE でサンプルも削除される）
    const { error: deleteError } = await supabase
      .from('ugc_styles')
      .delete()
      .eq('id', id)

    if (deleteError) {
      throw new Error(deleteError.message)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete UGC style:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'スタイルの削除に失敗しました' },
      { status: 500 }
    )
  }
}
