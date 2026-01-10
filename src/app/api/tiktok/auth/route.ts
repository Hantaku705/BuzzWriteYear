import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUrl } from '@/lib/tiktok/client'
import { randomBytes } from 'crypto'

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

    // CSRF対策用のstate生成
    const state = randomBytes(32).toString('hex')
    const csrfState = randomBytes(16).toString('hex')

    // stateをデータベースに保存（後でコールバックで検証）
    const { error: stateError } = await supabase
      .from('oauth_states')
      .insert({
        user_id: user.id,
        state,
        csrf_state: csrfState,
        provider: 'tiktok',
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10分有効
      } as never)

    if (stateError) {
      console.error('Failed to save OAuth state:', stateError)
      return NextResponse.json(
        { error: 'Failed to initiate OAuth' },
        { status: 500 }
      )
    }

    // TikTok認証URLにリダイレクト
    const authUrl = getAuthUrl(state, csrfState)

    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('TikTok auth error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
