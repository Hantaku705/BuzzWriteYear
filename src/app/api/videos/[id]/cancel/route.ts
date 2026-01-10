/**
 * 動画生成キャンセルAPI
 * POST /api/videos/[id]/cancel
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 動画を取得
    const { data, error: fetchError } = await supabase
      .from('videos')
      .select('id, status')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    const video = data as { id: string; status: string } | null

    if (fetchError || !video) {
      return NextResponse.json(
        { error: '動画が見つかりません' },
        { status: 404 }
      )
    }

    // 生成中の動画のみキャンセル可能
    if (video.status !== 'generating') {
      return NextResponse.json(
        { error: 'この動画はキャンセルできません' },
        { status: 400 }
      )
    }

    // ステータスをキャンセルに更新
    const { error: updateError } = await supabase
      .from('videos')
      .update({
        status: 'cancelled',
        progress: 0,
        progress_message: 'キャンセルされました',
      } as never)
      .eq('id', id)

    if (updateError) {
      console.error('Failed to cancel video:', updateError)
      return NextResponse.json(
        { error: 'キャンセルに失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '生成をキャンセルしました',
    })
  } catch (error) {
    console.error('Video cancel API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
