import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAccessToken, getUserInfo } from '@/lib/tiktok/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    // エラーチェック
    if (error) {
      console.error('TikTok OAuth error:', error, errorDescription)
      return NextResponse.redirect(
        new URL(`/settings?error=${encodeURIComponent(errorDescription || error)}`, request.url)
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/settings?error=missing_params', request.url)
      )
    }

    const supabase = await createClient()

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.redirect(
        new URL('/login?redirect=/settings', request.url)
      )
    }

    // state検証
    const { data: oauthState, error: stateError } = await supabase
      .from('oauth_states')
      .select('*')
      .eq('state', state)
      .eq('user_id', user.id)
      .eq('provider', 'tiktok')
      .single()

    if (stateError || !oauthState) {
      console.error('Invalid OAuth state:', stateError)
      return NextResponse.redirect(
        new URL('/settings?error=invalid_state', request.url)
      )
    }

    // state有効期限チェック
    const stateData = oauthState as { expires_at: string; id: string }
    if (new Date(stateData.expires_at) < new Date()) {
      return NextResponse.redirect(
        new URL('/settings?error=state_expired', request.url)
      )
    }

    // stateを削除（使い捨て）
    await supabase
      .from('oauth_states')
      .delete()
      .eq('id', stateData.id)

    // アクセストークン取得
    const tokenResponse = await getAccessToken(code)

    // ユーザー情報取得
    const userInfo = await getUserInfo(tokenResponse.access_token)

    // TikTokアカウント情報を保存
    const { error: upsertError } = await supabase
      .from('tiktok_accounts')
      .upsert({
        user_id: user.id,
        open_id: tokenResponse.open_id,
        access_token: tokenResponse.access_token,
        refresh_token: tokenResponse.refresh_token,
        token_expires_at: new Date(
          Date.now() + tokenResponse.expires_in * 1000
        ).toISOString(),
        display_name: userInfo.display_name,
        avatar_url: userInfo.avatar_url,
        follower_count: userInfo.follower_count,
        is_active: true,
        updated_at: new Date().toISOString(),
      } as never, {
        onConflict: 'user_id,open_id',
      })

    if (upsertError) {
      console.error('Failed to save TikTok account:', upsertError)
      return NextResponse.redirect(
        new URL('/settings?error=save_failed', request.url)
      )
    }

    // 成功時は設定ページにリダイレクト
    return NextResponse.redirect(
      new URL('/settings?success=tiktok_connected', request.url)
    )
  } catch (error) {
    console.error('TikTok callback error:', error)
    return NextResponse.redirect(
      new URL('/settings?error=callback_failed', request.url)
    )
  }
}
