import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'
import { z } from 'zod'

export const beforeAfterSchema = z.object({
  productName: z.string(),
  beforeImage: z.string(),
  afterImage: z.string(),
  beforeLabel: z.string(),
  afterLabel: z.string(),
  transitionStyle: z.enum(['slide', 'fade', 'wipe']),
  backgroundColor: z.string(),
  accentColor: z.string(),
})

type BeforeAfterProps = z.infer<typeof beforeAfterSchema>

export const BeforeAfter: React.FC<BeforeAfterProps> = ({
  productName,
  beforeImage,
  afterImage,
  beforeLabel,
  afterLabel,
  transitionStyle,
  backgroundColor,
  accentColor,
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // フェーズ
  const phase1End = fps * 1 // 0-1秒: タイトル
  const phase2End = fps * 4 // 1-4秒: Before
  const phase3End = fps * 5 // 4-5秒: トランジション
  const phase4End = fps * 9 // 5-9秒: After
  // 9-12秒: 両方表示

  // タイトルアニメーション
  const titleOpacity = interpolate(frame, [0, 15, fps * 0.8, phase1End], [0, 1, 1, 0], {
    extrapolateRight: 'clamp',
  })

  // Beforeフェーズ
  const beforeOpacity = interpolate(
    frame,
    [phase1End, phase1End + 15, phase2End - 15, phase2End],
    [0, 1, 1, transitionStyle === 'fade' ? 0 : 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )

  // スライドトランジション
  const slideProgress = interpolate(
    frame,
    [phase2End, phase3End],
    [0, 100],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )

  // Afterフェーズ
  const afterOpacity = interpolate(
    frame,
    [phase2End, phase3End],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )

  // 最終比較
  const splitView = frame > phase4End
  const splitProgress = spring({
    frame: frame - phase4End,
    fps,
    config: { damping: 20, stiffness: 100 },
  })

  // ラベルアニメーション
  const labelScale = spring({
    frame: frame - phase1End,
    fps,
    config: { damping: 15, stiffness: 80 },
  })

  const ImagePlaceholder = ({ label }: { label: string }) => (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#27272a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#71717a',
        fontSize: 32,
      }}
    >
      {label}画像
    </div>
  )

  return (
    <AbsoluteFill style={{ backgroundColor, fontFamily: 'sans-serif' }}>
      {/* タイトル */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: titleOpacity,
          zIndex: 10,
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 'bold',
            color: 'white',
            textAlign: 'center',
          }}
        >
          {productName}
          <div style={{ fontSize: 48, color: accentColor, marginTop: 20 }}>
            Before → After
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      {!splitView ? (
        <>
          {/* Before画像 */}
          <div
            style={{
              position: 'absolute',
              top: 200,
              left: 40,
              right: 40,
              height: 800,
              opacity: beforeOpacity,
              clipPath:
                transitionStyle === 'wipe'
                  ? `inset(0 ${slideProgress}% 0 0)`
                  : undefined,
            }}
          >
            {beforeImage ? (
              <Img
                src={beforeImage}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: 20,
                }}
              />
            ) : (
              <div style={{ width: '100%', height: '100%', borderRadius: 20, overflow: 'hidden' }}>
                <ImagePlaceholder label="Before" />
              </div>
            )}
            {/* Beforeラベル */}
            <div
              style={{
                position: 'absolute',
                top: 20,
                left: 20,
                backgroundColor: '#ef4444',
                padding: '12px 32px',
                borderRadius: 30,
                transform: `scale(${labelScale})`,
              }}
            >
              <span style={{ fontSize: 28, fontWeight: 'bold', color: 'white' }}>
                {beforeLabel}
              </span>
            </div>
          </div>

          {/* After画像 */}
          <div
            style={{
              position: 'absolute',
              top: 200,
              left: 40,
              right: 40,
              height: 800,
              opacity: afterOpacity,
              clipPath:
                transitionStyle === 'wipe'
                  ? `inset(0 0 0 ${100 - slideProgress}%)`
                  : undefined,
            }}
          >
            {afterImage ? (
              <Img
                src={afterImage}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: 20,
                }}
              />
            ) : (
              <div style={{ width: '100%', height: '100%', borderRadius: 20, overflow: 'hidden' }}>
                <ImagePlaceholder label="After" />
              </div>
            )}
            {/* Afterラベル */}
            <div
              style={{
                position: 'absolute',
                top: 20,
                right: 20,
                backgroundColor: '#22c55e',
                padding: '12px 32px',
                borderRadius: 30,
              }}
            >
              <span style={{ fontSize: 28, fontWeight: 'bold', color: 'white' }}>
                {afterLabel}
              </span>
            </div>
          </div>
        </>
      ) : (
        /* 分割ビュー */
        <div
          style={{
            position: 'absolute',
            top: 150,
            left: 40,
            right: 40,
            display: 'flex',
            gap: 20,
            transform: `scale(${splitProgress})`,
          }}
        >
          {/* Before */}
          <div style={{ flex: 1 }}>
            {beforeImage ? (
              <Img
                src={beforeImage}
                style={{
                  width: '100%',
                  height: 700,
                  objectFit: 'cover',
                  borderRadius: 20,
                }}
              />
            ) : (
              <div style={{ width: '100%', height: 700, borderRadius: 20, overflow: 'hidden' }}>
                <ImagePlaceholder label="Before" />
              </div>
            )}
            <div
              style={{
                textAlign: 'center',
                marginTop: 20,
                fontSize: 36,
                fontWeight: 'bold',
                color: '#ef4444',
              }}
            >
              {beforeLabel}
            </div>
          </div>

          {/* After */}
          <div style={{ flex: 1 }}>
            {afterImage ? (
              <Img
                src={afterImage}
                style={{
                  width: '100%',
                  height: 700,
                  objectFit: 'cover',
                  borderRadius: 20,
                }}
              />
            ) : (
              <div style={{ width: '100%', height: 700, borderRadius: 20, overflow: 'hidden' }}>
                <ImagePlaceholder label="After" />
              </div>
            )}
            <div
              style={{
                textAlign: 'center',
                marginTop: 20,
                fontSize: 36,
                fontWeight: 'bold',
                color: '#22c55e',
              }}
            >
              {afterLabel}
            </div>
          </div>
        </div>
      )}

      {/* 商品名（下部） */}
      <div
        style={{
          position: 'absolute',
          bottom: 200,
          left: 0,
          right: 0,
          textAlign: 'center',
          opacity: splitView ? splitProgress : afterOpacity,
        }}
      >
        <div style={{ fontSize: 48, fontWeight: 'bold', color: 'white' }}>
          {productName}
        </div>
        <div style={{ fontSize: 32, color: accentColor, marginTop: 10 }}>
          で変わる
        </div>
      </div>
    </AbsoluteFill>
  )
}
