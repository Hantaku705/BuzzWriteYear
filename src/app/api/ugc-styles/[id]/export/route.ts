/**
 * UGCスタイル エクスポート API
 * GET: スタイルをJSONファイルとしてエクスポート
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { UGCStyleExportJSON, StyleProfile, GenerationParams } from '@/types/ugc-style'

/**
 * GET /api/ugc-styles/[id]/export
 * スタイルをJSON形式でエクスポート
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

    const s = style as {
      status: string
      name: string
      description: string | null
      created_at: string
      sample_count: number
      style_profile: StyleProfile | Record<string, never>
      generation_params: GenerationParams | Record<string, never>
      keywords: string[]
      overall_vibe: string | null
    }

    // スタイルがreadyでない場合はエラー
    if (s.status !== 'ready') {
      return NextResponse.json(
        { error: 'スタイルの分析が完了していません' },
        { status: 400 }
      )
    }

    // JSON形式に変換
    const exportData: UGCStyleExportJSON = {
      version: '1.0',
      name: s.name,
      description: s.description,
      createdAt: s.created_at,
      sampleCount: s.sample_count,
      styleProfile: s.style_profile as StyleProfile,
      generationParams: s.generation_params as GenerationParams,
      keywords: s.keywords || [],
      overallVibe: s.overall_vibe || '',
    }

    // JSONをダウンロードレスポンスとして返す
    const filename = `ugc-style-${s.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Failed to export UGC style:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'エクスポートに失敗しました' },
      { status: 500 }
    )
  }
}
