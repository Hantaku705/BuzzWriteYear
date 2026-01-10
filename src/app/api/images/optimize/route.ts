import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  processImage,
  generateThumbnails,
  getImageMetadata,
  DEFAULT_SIZES,
} from '@/lib/image'

export async function POST(request: NextRequest) {
  try {
    // 認証チェック（セッションからユーザーIDを取得）
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // セッションからユーザーIDを取得（クライアント送信値を信頼しない）
    const userId = user.id

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const generateThumbs = formData.get('thumbnails') === 'true'
    const formatRaw = formData.get('format') as string | null
    const qualityRaw = parseInt(formData.get('quality') as string) || 85
    const maxWidthRaw = parseInt(formData.get('maxWidth') as string) || 1200

    // パラメータ検証（DoS対策）
    const allowedFormats = ['webp', 'jpeg', 'png'] as const
    const format = allowedFormats.includes(formatRaw as typeof allowedFormats[number])
      ? (formatRaw as 'webp' | 'jpeg' | 'png')
      : 'webp'
    const quality = Math.min(100, Math.max(1, qualityRaw))
    const maxWidth = Math.min(4000, Math.max(100, maxWidthRaw))

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // ファイルサイズ制限（10MB）
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const inputBuffer = Buffer.from(arrayBuffer)

    // Get original metadata
    const originalMetadata = await getImageMetadata(inputBuffer)

    // Process main image
    const processed = await processImage(inputBuffer, {
      maxWidth,
      quality,
      format,
    })

    // Generate unique filename
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(7)
    const baseName = `${userId}/${timestamp}-${random}`

    // Upload main image
    const mainPath = `${baseName}.${processed.format}`
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(mainPath, processed.buffer, {
        contentType: `image/${processed.format}`,
        cacheControl: '31536000', // 1 year cache
        upsert: false,
      })

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    const { data: { publicUrl: mainUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(mainPath)

    // Generate and upload thumbnails if requested
    const thumbnails: Record<string, { url: string; width: number; height: number }> = {}

    if (generateThumbs) {
      const thumbResults = await generateThumbnails(inputBuffer, {
        sizes: DEFAULT_SIZES,
        format: 'webp',
        quality: 80,
      })

      for (const [sizeName, thumb] of thumbResults) {
        const thumbPath = `${baseName}-${sizeName}.webp`
        const { error: thumbError } = await supabase.storage
          .from('product-images')
          .upload(thumbPath, thumb.buffer, {
            contentType: 'image/webp',
            cacheControl: '31536000',
            upsert: false,
          })

        if (!thumbError) {
          const { data: { publicUrl } } = supabase.storage
            .from('product-images')
            .getPublicUrl(thumbPath)

          thumbnails[sizeName] = {
            url: publicUrl,
            width: thumb.width,
            height: thumb.height,
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      image: {
        url: mainUrl,
        path: mainPath,
        format: processed.format,
        width: processed.width,
        height: processed.height,
        size: processed.size,
      },
      thumbnails,
      original: {
        width: originalMetadata.width,
        height: originalMetadata.height,
        format: originalMetadata.format,
        size: originalMetadata.size,
      },
      compression: {
        ratio: Math.round((1 - processed.size / originalMetadata.size) * 100),
        savedBytes: originalMetadata.size - processed.size,
      },
    })
  } catch (error) {
    console.error('Image optimization error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Image optimization failed' },
      { status: 500 }
    )
  }
}
