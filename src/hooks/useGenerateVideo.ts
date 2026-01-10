'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { videoKeys } from './useVideos'

export type CompositionId = 'ProductIntro' | 'BeforeAfter' | 'ReviewText' | 'FeatureList'

export interface ProductIntroProps {
  productName: string
  productImage: string
  price: number
  catchCopy: string
  features: string[]
  ctaText: string
  backgroundColor?: string
  accentColor?: string
}

export interface BeforeAfterProps {
  productName: string
  beforeImage: string
  afterImage: string
  beforeLabel?: string
  afterLabel?: string
  transitionStyle?: 'slide' | 'fade' | 'wipe'
  backgroundColor?: string
  accentColor?: string
}

export interface ReviewTextProps {
  productName: string
  reviewText: string
  rating: number
  reviewerName: string
  productImage: string
  backgroundColor?: string
  accentColor?: string
}

export interface FeatureListProps {
  productName: string
  productImage: string
  features: Array<{
    icon: string
    title: string
    description: string
  }>
  backgroundColor?: string
  accentColor?: string
}

export type InputProps = ProductIntroProps | BeforeAfterProps | ReviewTextProps | FeatureListProps

export interface GenerateVideoData {
  productId: string
  templateId?: string
  compositionId: CompositionId
  title: string
  inputProps: InputProps
}

const contentTypeMap: Record<CompositionId, string> = {
  ProductIntro: 'product_intro',
  BeforeAfter: 'before_after',
  ReviewText: 'review',
  FeatureList: 'feature_list',
}

const durationMap: Record<CompositionId, number> = {
  ProductIntro: 15,
  BeforeAfter: 12,
  ReviewText: 10,
  FeatureList: 15,
}

async function createVideoRecord(data: GenerateVideoData) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('ログインが必要です')
  }

  const { data: video, error } = await supabase
    .from('videos')
    .insert({
      user_id: user.id,
      product_id: data.productId,
      template_id: data.templateId || null,
      title: data.title,
      content_type: contentTypeMap[data.compositionId],
      generation_method: 'remotion',
      status: 'draft',
      duration_seconds: durationMap[data.compositionId],
      input_props: data.inputProps,
    } as never)
    .select()
    .single()

  if (error) {
    throw new Error(`動画の保存に失敗しました: ${error.message}`)
  }

  return video
}

export function useGenerateVideo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createVideoRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: videoKeys.all })
    },
  })
}
