import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  processImage,
  generateThumbnails,
  getImageMetadata,
  DEFAULT_SIZES,
} from '@/lib/image'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const userId = formData.get('userId') as string | null
    const generateThumbs = formData.get('thumbnails') === 'true'
    const format = (formData.get('format') as 'webp' | 'jpeg' | 'png') || 'webp'
    const quality = parseInt(formData.get('quality') as string) || 85
    const maxWidth = parseInt(formData.get('maxWidth') as string) || 1200

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
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
