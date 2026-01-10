import { Composition } from 'remotion'
import { ProductIntro, productIntroSchema } from './compositions/ProductIntro'
import { BeforeAfter, beforeAfterSchema } from './compositions/BeforeAfter'
import { ReviewText, reviewTextSchema } from './compositions/ReviewText'
import { FeatureList, featureListSchema } from './compositions/FeatureList'

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* 商品紹介 - ベーシック */}
      <Composition
        id="ProductIntro"
        component={ProductIntro}
        durationInFrames={450} // 15秒 @ 30fps
        fps={30}
        width={1080}
        height={1920}
        schema={productIntroSchema}
        defaultProps={{
          productName: 'サンプル商品',
          productImage: '',
          price: 2980,
          catchCopy: 'これ1つで変わる',
          features: ['特徴1', '特徴2', '特徴3'],
          ctaText: '今すぐチェック',
          backgroundColor: '#000000',
          accentColor: '#ec4899',
        }}
      />

      {/* Before/After 比較 */}
      <Composition
        id="BeforeAfter"
        component={BeforeAfter}
        durationInFrames={360} // 12秒 @ 30fps
        fps={30}
        width={1080}
        height={1920}
        schema={beforeAfterSchema}
        defaultProps={{
          productName: 'サンプル商品',
          beforeImage: '',
          afterImage: '',
          beforeLabel: 'Before',
          afterLabel: 'After',
          transitionStyle: 'slide',
          backgroundColor: '#000000',
          accentColor: '#ec4899',
        }}
      />

      {/* レビュー風テキスト */}
      <Composition
        id="ReviewText"
        component={ReviewText}
        durationInFrames={300} // 10秒 @ 30fps
        fps={30}
        width={1080}
        height={1920}
        schema={reviewTextSchema}
        defaultProps={{
          productName: 'サンプル商品',
          reviewText: 'これ使い始めてから本当に変わった...',
          rating: 5,
          reviewerName: '購入者',
          productImage: '',
          backgroundColor: '#000000',
          accentColor: '#ec4899',
        }}
      />

      {/* 特徴リスト */}
      <Composition
        id="FeatureList"
        component={FeatureList}
        durationInFrames={450} // 15秒 @ 30fps
        fps={30}
        width={1080}
        height={1920}
        schema={featureListSchema}
        defaultProps={{
          productName: 'サンプル商品',
          productImage: '',
          features: [
            { icon: '✨', title: '特徴1', description: '説明文' },
            { icon: '🎯', title: '特徴2', description: '説明文' },
            { icon: '💪', title: '特徴3', description: '説明文' },
          ],
          backgroundColor: '#000000',
          accentColor: '#ec4899',
        }}
      />
    </>
  )
}
