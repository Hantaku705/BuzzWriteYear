import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getPhotoAvatarStatus,
  getTrainingStatus,
} from '@/lib/video/heygen/custom-avatar'

/**
 * GET /api/videos/heygen/avatar/[id]/status
 * アバター/トレーニング状態取得
 *
 * Query params:
 * - type: 'photo' | 'video' (required)
 * - trainingId: string (required for video type)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const trainingId = searchParams.get('trainingId')

    if (!type || (type !== 'photo' && type !== 'video')) {
      return NextResponse.json(
        { error: 'type parameter is required (photo or video)' },
        { status: 400 }
      )
    }

    if (type === 'photo') {
      // Photo Avatar ステータス取得
      const status = await getPhotoAvatarStatus(id)

      return NextResponse.json({
        success: true,
        status: {
          avatarId: status.avatar_id,
          name: status.name,
          status: status.status,
          previewUrl: status.preview_image_url,
          error: status.error,
        },
      })
    } else {
      // Video Avatar トレーニングステータス取得
      if (!trainingId) {
        return NextResponse.json(
          { error: 'trainingId parameter is required for video type' },
          { status: 400 }
        )
      }

      const status = await getTrainingStatus(trainingId)

      return NextResponse.json({
        success: true,
        status: {
          trainingId: status.training_id,
          status: status.status,
          progress: status.progress,
          estimatedTimeMinutes: status.estimated_time_minutes,
          error: status.error,
        },
      })
    }
  } catch (error) {
    console.error('Avatar status error:', error)

    if (error instanceof Error && error.message.includes('HeyGen API error')) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
