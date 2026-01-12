import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import {
  createPhotoAvatar,
  createVideoAvatar,
  listCustomAvatars,
} from '@/lib/video/heygen/custom-avatar'

// Photo Avatar作成スキーマ
const photoAvatarSchema = z.object({
  type: z.literal('photo'),
  imageUrl: z.string().url(),
  name: z.string().min(1).max(100),
  gender: z.enum(['male', 'female']).optional(),
})

// Video Avatar作成スキーマ
const videoAvatarSchema = z.object({
  type: z.literal('video'),
  trainingVideoUrl: z.string().url(),
  consentVideoUrl: z.string().url(),
  name: z.string().min(1).max(100),
})

const createAvatarSchema = z.discriminatedUnion('type', [
  photoAvatarSchema,
  videoAvatarSchema,
])

/**
 * POST /api/videos/heygen/avatar
 * カスタムアバター作成（Photo/Video）
 */
export async function POST(request: NextRequest) {
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

    // リクエストボディ解析
    const body = await request.json()
    const validationResult = createAvatarSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const data = validationResult.data

    if (data.type === 'photo') {
      // Photo Avatar作成
      const result = await createPhotoAvatar({
        name: data.name,
        image_url: data.imageUrl,
        gender: data.gender,
      })

      return NextResponse.json({
        success: true,
        avatar: {
          avatarId: result.avatar_id,
          name: result.name,
          type: 'photo',
          status: result.status,
          previewUrl: result.preview_image_url,
        },
        message: 'Photo Avatarの作成を開始しました。完了まで数分かかります。',
      })
    } else {
      // Video Avatar作成
      const result = await createVideoAvatar({
        name: data.name,
        training_video_url: data.trainingVideoUrl,
        consent_video_url: data.consentVideoUrl,
      })

      return NextResponse.json({
        success: true,
        avatar: {
          avatarId: result.avatar_id,
          trainingId: result.training_id,
          name: result.name,
          type: 'video',
          status: result.status,
          estimatedTime: result.estimated_time_minutes,
        },
        message: 'Video Avatarのトレーニングを開始しました。完了まで数時間〜1日かかる場合があります。',
      })
    }
  } catch (error) {
    console.error('Avatar creation error:', error)

    // HeyGen APIエラーの詳細を返す
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

/**
 * GET /api/videos/heygen/avatar
 * カスタムアバター一覧取得
 */
export async function GET() {
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

    const avatars = await listCustomAvatars()

    return NextResponse.json({
      success: true,
      avatars: avatars.map(a => ({
        avatarId: a.avatar_id,
        name: a.name,
        type: a.type,
        status: a.status,
        previewImageUrl: a.preview_image_url,
        previewVideoUrl: a.preview_video_url,
        createdAt: a.created_at,
      })),
    })
  } catch (error) {
    console.error('List avatars error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
