/**
 * 動画生成進捗取得API
 * GET /api/videos/[id]/status
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
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
    const { data, error } = await supabase
      .from('videos')
      .select('id, status, progress, progress_message, remote_url')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    interface VideoRow {
      id: string
      status: string
      progress: number | null
      progress_message: string | null
      remote_url: string | null
    }
    const video = data as VideoRow | null

    if (error || !video) {
      return NextResponse.json(
        { error: '動画が見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: video.id,
      status: video.status,
      progress: video.progress ?? 0,
      message: video.progress_message ?? getDefaultMessage(video.status),
      remoteUrl: video.remote_url,
    })
  } catch (error) {
    console.error('Video status API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function getDefaultMessage(status: string): string {
  switch (status) {
    case 'draft':
      return '下書き'
    case 'generating':
      return '動画を生成中...'
    case 'ready':
      return '生成完了'
    case 'posting':
      return '投稿中...'
    case 'posted':
      return '投稿完了'
    case 'failed':
      return '生成に失敗しました'
    case 'cancelled':
      return 'キャンセルされました'
    default:
      return ''
  }
}
