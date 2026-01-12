import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { TikTokAccountResponse } from '@/types/tiktok'

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

    // 連携済みTikTokアカウント取得
    const { data: accounts, error: accountsError } = await supabase
      .from('tiktok_accounts')
      .select('id, open_id, display_name, avatar_url, follower_count, is_active, token_expires_at')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (accountsError) {
      console.error('Failed to fetch TikTok accounts:', accountsError)
      return NextResponse.json(
        { error: 'Failed to fetch accounts' },
        { status: 500 }
      )
    }

    type TikTokAccountRow = {
      id: string
      open_id: string
      display_name: string | null
      avatar_url: string | null
      follower_count: number | null
      is_active: boolean
      token_expires_at: string
    }
    const accountList = (accounts as TikTokAccountRow[] | null) ?? []

    const response: TikTokAccountResponse[] = accountList.map((account) => ({
      id: account.id,
      open_id: account.open_id,
      display_name: account.display_name || 'TikTok User',
      avatar_url: account.avatar_url,
      follower_count: account.follower_count,
      is_active: account.is_active,
      token_expires_at: account.token_expires_at,
    }))

    return NextResponse.json({ accounts: response })
  } catch (error) {
    console.error('TikTok accounts fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// アカウント連携解除
export async function DELETE(request: NextRequest) {
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
    const accountId = searchParams.get('accountId')

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 })
    }

    // アカウント削除（論理削除）
    const { error: deleteError } = await supabase
      .from('tiktok_accounts')
      .update({ is_active: false } as never)
      .eq('id', accountId)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Failed to disconnect TikTok account:', deleteError)
      return NextResponse.json(
        { error: 'Failed to disconnect account' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('TikTok account disconnect error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
