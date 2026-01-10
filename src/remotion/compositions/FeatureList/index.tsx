import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'
import { z } from 'zod'

const featureItemSchema = z.object({
  icon: z.string(),
  title: z.string(),
  description: z.string(),
})

export const featureListSchema = z.object({
  productName: z.string(),
  productImage: z.string(),
  features: z.array(featureItemSchema),
  backgroundColor: z.string(),
  accentColor: z.string(),
})

type FeatureListProps = z.infer<typeof featureListSchema>

export const FeatureList: React.FC<FeatureListProps> = ({
  productName,
  productImage,
  features,
  backgroundColor,
  accentColor,
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

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
  const productOpacity = interpolate(
    frame,
    [fps * 0.5, fps * 1],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )
  const productScale = spring({
    frame: frame - fps * 0.5,
    fps,
    config: { damping: 15, stiffness: 80 },
  })

  // 各特徴のアニメーション
  const featureAnimations = features.map((_, index) => {
    const startFrame = fps * 3 + index * fps * 2.5
    const endFrame = startFrame + fps * 2

    return {
      opacity: interpolate(
        frame,
        [startFrame, startFrame + 15, endFrame - 15, endFrame],
        [0, 1, 1, index === features.length - 1 ? 1 : 0.3],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
      ),
      scale: spring({
        frame: frame - startFrame,
        fps,
        config: { damping: 15, stiffness: 100 },
      }),
      iconRotation: spring({
        frame: frame - startFrame,
        fps,
        config: { damping: 10, stiffness: 150 },
      }),
    }
  })

  // 現在表示中の特徴インデックス
  const currentFeatureIndex = Math.min(
    Math.floor((frame - fps * 3) / (fps * 2.5)),
    features.length - 1
  )

  return (
    <AbsoluteFill style={{ backgroundColor, fontFamily: 'sans-serif' }}>
      {/* 背景装飾 */}
      <div
        style={{
          position: 'absolute',
          top: -200,
          right: -200,
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accentColor}20 0%, transparent 70%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -100,
          left: -100,
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accentColor}15 0%, transparent 70%)`,
        }}
      />

      {/* タイトル */}
      <div
        style={{
          position: 'absolute',
          top: 100,
          left: 0,
          right: 0,
          textAlign: 'center',
          opacity: titleOpacity,
          transform: `translateY(${(1 - titleY) * 30}px)`,
        }}
      >
        <div
          style={{
            fontSize: 56,
            fontWeight: 'bold',
            color: 'white',
          }}
        >
          {productName}
        </div>
        <div
          style={{
            fontSize: 36,
            color: accentColor,
            marginTop: 10,
          }}
        >
          の3つの特徴
        </div>
      </div>

      {/* 商品画像 */}
      <div
        style={{
          position: 'absolute',
          top: 280,
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
              width: 350,
              height: 350,
              objectFit: 'contain',
              borderRadius: 20,
            }}
          />
        ) : (
          <div
            style={{
              width: 350,
              height: 350,
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

      {/* 特徴リスト */}
      <div
        style={{
          position: 'absolute',
          top: 700,
          left: 40,
          right: 40,
        }}
      >
        {features.map((feature, index) => {
          const anim = featureAnimations[index]
          const isCurrentOrPast = index <= currentFeatureIndex

          return (
            <div
              key={index}
              style={{
                opacity: isCurrentOrPast ? anim.opacity : 0,
                transform: `scale(${isCurrentOrPast ? anim.scale : 0})`,
                marginBottom: 30,
                padding: 30,
                backgroundColor:
                  index === currentFeatureIndex
                    ? `${accentColor}20`
                    : 'rgba(39, 39, 42, 0.5)',
                borderRadius: 20,
                border:
                  index === currentFeatureIndex
                    ? `2px solid ${accentColor}`
                    : '2px solid transparent',
                transition: 'background-color 0.3s, border 0.3s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                {/* アイコン */}
                <div
                  style={{
                    width: 70,
                    height: 70,
                    borderRadius: '50%',
                    backgroundColor: accentColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 36,
                    transform: `rotate(${(1 - anim.iconRotation) * 360}deg)`,
                  }}
                >
                  {feature.icon}
                </div>

                {/* テキスト */}
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 36,
                      fontWeight: 'bold',
                      color: 'white',
                      marginBottom: 8,
                    }}
                  >
                    {feature.title}
                  </div>
                  <div
                    style={{
                      fontSize: 26,
                      color: '#a1a1aa',
                    }}
                  >
                    {feature.description}
                  </div>
                </div>

                {/* 番号 */}
                <div
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                    fontWeight: 'bold',
                    color: 'white',
                  }}
                >
                  {index + 1}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* プログレスバー */}
      <div
        style={{
          position: 'absolute',
          bottom: 100,
          left: 60,
          right: 60,
          height: 6,
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderRadius: 3,
        }}
      >
        <div
          style={{
            width: `${((currentFeatureIndex + 1) / features.length) * 100}%`,
            height: '100%',
            backgroundColor: accentColor,
            borderRadius: 3,
            transition: 'width 0.3s ease-out',
          }}
        />
      </div>
    </AbsoluteFill>
  )
}
