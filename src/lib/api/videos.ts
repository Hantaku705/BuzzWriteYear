import { createClient } from '@/lib/supabase/client'
import type { Video, VideoInsert } from '@/types/database'

export interface VideoWithProduct extends Video {
  product?: {
    id: string
    name: string
    images: string[]
  } | null
}

export async function getVideos(): Promise<VideoWithProduct[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('videos')
    .select(
      `
      *,
      product:products(id, name, images)
    `
    )
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data as VideoWithProduct[] | null) ?? []
}

export async function getVideosByStatus(status: string): Promise<VideoWithProduct[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('videos')
    .select(
      `
      *,
      product:products(id, name, images)
    `
    )
    .eq('status', status)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data as VideoWithProduct[] | null) ?? []
}

export async function getVideo(id: string): Promise<VideoWithProduct | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('videos')
    .select(
      `
      *,
      product:products(id, name, images)
    `
    )
    .eq('id', id)
    .single()

  if (error) throw error
  return data as VideoWithProduct | null
}

export async function createVideo(video: Omit<VideoInsert, 'user_id'>): Promise<Video> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const insertData = {
    title: video.title,
    content_type: video.content_type,
    generation_method: video.generation_method,
    user_id: user.id,
    product_id: video.product_id ?? null,
    template_id: video.template_id ?? null,
    status: video.status ?? 'draft',
    tiktok_video_id: video.tiktok_video_id ?? null,
    local_path: video.local_path ?? null,
    remote_url: video.remote_url ?? null,
    duration_seconds: video.duration_seconds ?? null,
    posted_at: video.posted_at ?? null,
  }

  const { data, error } = await supabase
    .from('videos')
    .insert(insertData as never)
    .select()
    .single()

  if (error) throw error
  return data as Video
}

export async function updateVideoStatus(id: string, status: string): Promise<Video> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('videos')
    .update({ status } as never)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Video
}

export async function deleteVideo(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('videos').delete().eq('id', id)

  if (error) throw error
}
