import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'
import { z } from 'zod'

export const productIntroSchema = z.object({
  productName: z.string(),
  productImage: z.string(),
  price: z.number(),
  catchCopy: z.string(),
  features: z.array(z.string()),
  ctaText: z.string(),
  backgroundColor: z.string(),
  accentColor: z.string(),
})

type ProductIntroProps = z.infer<typeof productIntroSchema>

export const ProductIntro: React.FC<ProductIntroProps> = ({
  productName,
  productImage,
  price,
  catchCopy,
  features,
  ctaText,
  backgroundColor,
  accentColor,
}) => {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()

  // アニメーションフェーズ
  const phase1End = fps * 2 // 0-2秒: タイトル
  const phase2End = fps * 5 // 2-5秒: 商品画像
  const phase3End = fps * 10 // 5-10秒: 特徴
  const phase4End = fps * 13 // 10-13秒: 価格
  // 13-15秒: CTA

  // タイトルアニメーション
  const titleOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: 'clamp',
  })
  const titleY = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 100 },
  })

  // 商品画像アニメーション
  const productScale = spring({
    frame: frame - phase1End,
    fps,
    config: { damping: 15, stiffness: 80 },
  })
  const productOpacity = interpolate(
    frame,
    [phase1End, phase1End + 15],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )

  // 特徴アニメーション
  const featureAnimations = features.map((_, index) => {
    const startFrame = phase2End + index * 20
    return {
      opacity: interpolate(frame, [startFrame, startFrame + 10], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      }),
      x: spring({
        frame: frame - startFrame,
        fps,
        config: { damping: 20, stiffness: 100 },
      }),
    }
  })

  // 価格アニメーション
  const priceScale = spring({
    frame: frame - phase3End,
    fps,
    config: { damping: 12, stiffness: 100 },
  })
  const priceOpacity = interpolate(
    frame,
    [phase3End, phase3End + 10],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )

  // CTAアニメーション
  const ctaOpacity = interpolate(frame, [phase4End, phase4End + 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const ctaPulse = Math.sin((frame - phase4End) * 0.1) * 0.05 + 1

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        fontFamily: 'sans-serif',
      }}
    >
      {/* 背景グラデーション */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `radial-gradient(circle at 50% 30%, ${accentColor}20 0%, transparent 50%)`,
        }}
      />

      {/* キャッチコピー */}
      <div
        style={{
          position: 'absolute',
          top: 120,
          left: 0,
          right: 0,
          textAlign: 'center',
          opacity: titleOpacity,
          transform: `translateY(${(1 - titleY) * 50}px)`,
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 'bold',
            color: 'white',
            textShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}
        >
          {catchCopy}
        </div>
      </div>

      {/* 商品画像 */}
      <div
        style={{
          position: 'absolute',
          top: 300,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          opacity: productOpacity,
          transform: `scale(${productScale})`,
        }}
      >
        {productImage ? (
          <Img
            src={productImage}
            style={{
              width: 500,
              height: 500,
              objectFit: 'contain',
              borderRadius: 20,
            }}
          />
        ) : (
          <div
            style={{
              width: 500,
              height: 500,
              backgroundColor: '#27272a',
              borderRadius: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#71717a',
              fontSize: 24,
            }}
          >
            商品画像
          </div>
        )}
      </div>

      {/* 商品名 */}
      <div
        style={{
          position: 'absolute',
          top: 830,
          left: 0,
          right: 0,
          textAlign: 'center',
          opacity: productOpacity,
        }}
      >
        <div
          style={{
            fontSize: 48,
            fontWeight: 'bold',
            color: 'white',
          }}
        >
          {productName}
        </div>
      </div>

      {/* 特徴リスト */}
      <div
        style={{
          position: 'absolute',
          top: 950,
          left: 60,
          right: 60,
        }}
      >
        {features.map((feature, index) => (
          <div
            key={index}
            style={{
              opacity: featureAnimations[index]?.opacity ?? 0,
              transform: `translateX(${(1 - (featureAnimations[index]?.x ?? 0)) * 100}px)`,
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                backgroundColor: accentColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: 20,
              }}
            >
              ✓
            </div>
            <div
              style={{
                fontSize: 36,
                color: 'white',
              }}
            >
              {feature}
            </div>
          </div>
        ))}
      </div>

      {/* 価格 */}
      <div
        style={{
          position: 'absolute',
          bottom: 350,
          left: 0,
          right: 0,
          textAlign: 'center',
          opacity: priceOpacity,
          transform: `scale(${priceScale})`,
        }}
      >
        <div
          style={{
            fontSize: 32,
            color: '#a1a1aa',
            marginBottom: 8,
          }}
        >
          特別価格
        </div>
        <div
          style={{
            fontSize: 80,
            fontWeight: 'bold',
            color: accentColor,
          }}
        >
          ¥{price.toLocaleString()}
        </div>
      </div>

      {/* CTA */}
      <div
        style={{
          position: 'absolute',
          bottom: 150,
          left: 60,
          right: 60,
          opacity: ctaOpacity,
          transform: `scale(${ctaPulse})`,
        }}
      >
        <div
          style={{
            backgroundColor: accentColor,
            borderRadius: 60,
            padding: '30px 60px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 40,
              fontWeight: 'bold',
              color: 'white',
            }}
          >
            {ctaText}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  )
}
