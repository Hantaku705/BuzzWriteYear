'use client'

import { Player } from '@remotion/player'
import { useMemo, ComponentType } from 'react'
import { AlertCircle } from 'lucide-react'
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
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: 16,
        }}
      >
        <AlertCircle style={{ width: 32, height: 32, color: '#ef4444' }} />
        <p style={{ color: '#ef4444', fontSize: 14, fontWeight: 500 }}>
          テンプレート読み込みエラー
        </p>
        <p style={{ color: '#71717a', fontSize: 12, textAlign: 'center' }}>
          ID: <code style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: 4 }}>{compositionId}</code>
        </p>
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
