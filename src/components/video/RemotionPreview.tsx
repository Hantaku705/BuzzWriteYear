'use client'

import { Player } from '@remotion/player'
import { useMemo, ComponentType } from 'react'
import { ProductIntro } from '@/remotion/compositions/ProductIntro'
import { BeforeAfter } from '@/remotion/compositions/BeforeAfter'
import { ReviewText } from '@/remotion/compositions/ReviewText'
import { FeatureList } from '@/remotion/compositions/FeatureList'

type CompositionId = 'ProductIntro' | 'BeforeAfter' | 'ReviewText' | 'FeatureList'

interface RemotionPreviewProps {
  compositionId: CompositionId
  inputProps: Record<string, unknown>
  width?: number
  height?: number
  autoPlay?: boolean
  loop?: boolean
  controls?: boolean
}

interface CompositionConfig {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: ComponentType<any>
  durationInFrames: number
  fps: number
}

const compositions: Record<CompositionId, CompositionConfig> = {
  ProductIntro: {
    component: ProductIntro,
    durationInFrames: 450,
    fps: 30,
  },
  BeforeAfter: {
    component: BeforeAfter,
    durationInFrames: 360,
    fps: 30,
  },
  ReviewText: {
    component: ReviewText,
    durationInFrames: 300,
    fps: 30,
  },
  FeatureList: {
    component: FeatureList,
    durationInFrames: 450,
    fps: 30,
  },
}

export function RemotionPreview({
  compositionId,
  inputProps,
  width = 270,
  height = 480,
  autoPlay = false,
  loop = true,
  controls = true,
}: RemotionPreviewProps) {
  const composition = compositions[compositionId]

  const playerStyle = useMemo(
    () => ({
      width,
      height,
      borderRadius: 12,
      overflow: 'hidden' as const,
    }),
    [width, height]
  )

  if (!composition) {
    return (
      <div
        style={{
          width,
          height,
          backgroundColor: '#27272a',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#71717a',
        }}
      >
        Unknown composition
      </div>
    )
  }

  return (
    <Player
      component={composition.component}
      inputProps={inputProps}
      durationInFrames={composition.durationInFrames}
      fps={composition.fps}
      compositionWidth={1080}
      compositionHeight={1920}
      style={playerStyle}
      autoPlay={autoPlay}
      loop={loop}
      controls={controls}
    />
  )
}
