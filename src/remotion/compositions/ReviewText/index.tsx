import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'
import { z } from 'zod'

export const reviewTextSchema = z.object({
  productName: z.string(),
  reviewText: z.string(),
  rating: z.number().min(1).max(5),
  reviewerName: z.string(),
  productImage: z.string(),
  backgroundColor: z.string(),
  accentColor: z.string(),
})

type ReviewTextProps = z.infer<typeof reviewTextSchema>

export const ReviewText: React.FC<ReviewTextProps> = ({
  productName,
  reviewText,
  rating,
  reviewerName,
  productImage,
  backgroundColor,
  accentColor,
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // テキストをタイプライター風に表示
  const charsToShow = Math.floor(
    interpolate(frame, [fps * 1, fps * 6], [0, reviewText.length], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  )

  // 星評価アニメーション
  const starAnimations = Array.from({ length: 5 }, (_, i) => {
    const startFrame = fps * 6.5 + i * 5
    return spring({
      frame: frame - startFrame,
      fps,
      config: { damping: 10, stiffness: 200 },
    })
  })

  // 商品画像アニメーション
  const productOpacity = interpolate(
    frame,
    [fps * 7.5, fps * 8],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )
  const productScale = spring({
    frame: frame - fps * 7.5,
    fps,
    config: { damping: 15, stiffness: 80 },
  })

  // レビュワー名アニメーション
  const reviewerOpacity = interpolate(
    frame,
    [fps * 0.5, fps * 1],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )

  return (
    <AbsoluteFill style={{ backgroundColor, fontFamily: 'sans-serif' }}>
      {/* 背景パターン */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 20% 80%, ${accentColor}10 0%, transparent 30%),
            radial-gradient(circle at 80% 20%, ${accentColor}10 0%, transparent 30%)
          `,
        }}
      />

      {/* 引用マーク */}
      <div
        style={{
          position: 'absolute',
          top: 150,
          left: 60,
          fontSize: 200,
          color: accentColor,
          opacity: 0.3,
          fontFamily: 'serif',
          lineHeight: 1,
        }}
      >
        "
      </div>

      {/* レビュワー情報 */}
      <div
        style={{
          position: 'absolute',
          top: 200,
          left: 60,
          right: 60,
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          opacity: reviewerOpacity,
        }}
      >
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            backgroundColor: accentColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
            color: 'white',
            fontWeight: 'bold',
          }}
        >
          {reviewerName.charAt(0)}
        </div>
        <div>
          <div style={{ fontSize: 32, color: 'white', fontWeight: 'bold' }}>
            {reviewerName}
          </div>
          <div style={{ fontSize: 24, color: '#71717a' }}>購入者レビュー</div>
        </div>
      </div>

      {/* レビューテキスト */}
      <div
        style={{
          position: 'absolute',
          top: 350,
          left: 60,
          right: 60,
        }}
      >
        <div
          style={{
            fontSize: 52,
            color: 'white',
            lineHeight: 1.6,
            fontWeight: 500,
          }}
        >
          {reviewText.slice(0, charsToShow)}
          <span
            style={{
              opacity: frame % 30 < 15 ? 1 : 0,
              color: accentColor,
            }}
          >
            |
          </span>
        </div>
      </div>

      {/* 星評価 */}
      <div
        style={{
          position: 'absolute',
          top: 900,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          gap: 16,
        }}
      >
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            style={{
              fontSize: 60,
              transform: `scale(${starAnimations[i]})`,
              opacity: starAnimations[i],
            }}
          >
            {i < rating ? '⭐' : '☆'}
          </div>
        ))}
      </div>

      {/* 商品画像 */}
      <div
        style={{
          position: 'absolute',
          bottom: 350,
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
              width: 300,
              height: 300,
              objectFit: 'contain',
              borderRadius: 20,
            }}
          />
        ) : (
          <div
            style={{
              width: 300,
              height: 300,
              backgroundColor: '#27272a',
              borderRadius: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#71717a',
              fontSize: 20,
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
          bottom: 200,
          left: 0,
          right: 0,
          textAlign: 'center',
          opacity: productOpacity,
        }}
      >
        <div style={{ fontSize: 40, fontWeight: 'bold', color: 'white' }}>
          {productName}
        </div>
      </div>

      {/* 閉じ引用マーク */}
      <div
        style={{
          position: 'absolute',
          bottom: 400,
          right: 60,
          fontSize: 200,
          color: accentColor,
          opacity: 0.3,
          fontFamily: 'serif',
          lineHeight: 1,
          transform: 'rotate(180deg)',
        }}
      >
        "
      </div>
    </AbsoluteFill>
  )
}
