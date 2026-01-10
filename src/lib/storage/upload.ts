import { createClient } from '@/lib/supabase/client'

export interface UploadResult {
  url: string
  path: string
}

export async function uploadImage(
  file: File,
  bucket: string = 'product-images'
): Promise<UploadResult> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) throw error

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path)

  return {
    url: publicUrl,
    path: data.path,
  }
}

export async function deleteImage(
  path: string,
  bucket: string = 'product-images'
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) throw error
}

export function compressImage(file: File, maxWidth: number = 1200): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Could not get canvas context'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Could not compress image'))
              return
            }
            resolve(new File([blob], file.name, { type: 'image/jpeg' }))
          },
          'image/jpeg',
          0.8
        )
      }
      img.onerror = () => reject(new Error('Could not load image'))
    }
    reader.onerror = () => reject(new Error('Could not read file'))
  })
}
