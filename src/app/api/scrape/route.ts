/**
 * 商品URLスクレイピング APIエンドポイント
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { scrapeProductUrl } from '@/lib/scraper'
import { z } from 'zod'

const scrapeSchema = z.object({
  url: z.string().url('有効なURLを入力してください'),
})

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

    // リクエスト検証
    const body = await request.json()
    const validation = scrapeSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: '無効なリクエストです', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { url } = validation.data

    // スクレイピング実行
    const result = await scrapeProductUrl(url)

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error || 'スクレイピングに失敗しました' },
        { status: 422 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    })
  } catch (error) {
    console.error('Scrape API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
