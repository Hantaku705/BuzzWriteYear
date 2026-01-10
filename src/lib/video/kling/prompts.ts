/**
 * Kling AI プロンプトプリセット
 *
 * TikTok Shop向けの商品紹介動画用プロンプトテンプレート
 */

export interface PromptPreset {
  id: string
  label: string
  labelJa: string
  description: string
  prompt: string
  negativePrompt: string
}

export const KLING_PRESETS: PromptPreset[] = [
  {
    id: 'product_showcase',
    label: 'Product Showcase',
    labelJa: '商品紹介',
    description: '商品が回転しながら映える、プロ品質の商品紹介動画',
    prompt:
      'Product rotating slowly on a clean minimalist background, professional commercial lighting, smooth cinematic camera movement, high-end product photography style, studio quality, sharp focus, 4K quality',
    negativePrompt:
      'blurry, low quality, distorted, ugly, amateur, shaky, overexposed, underexposed',
  },
  {
    id: 'lifestyle',
    label: 'Lifestyle',
    labelJa: '使用シーン',
    description: '実際の使用シーンを想起させる、ライフスタイル動画',
    prompt:
      'Person naturally using the product in a cozy lifestyle setting, warm golden hour lighting, cinematic depth of field, authentic and relatable atmosphere, Instagram-worthy aesthetic',
    negativePrompt:
      'artificial, staged, fake, low quality, blurry, harsh lighting',
  },
  {
    id: 'unboxing',
    label: 'Unboxing',
    labelJa: '開封',
    description: '期待感を煽る開封シーン',
    prompt:
      'Hands carefully opening a premium package revealing the product inside, anticipation building, satisfying unboxing experience, clean background, soft natural lighting, ASMR-like quality',
    negativePrompt:
      'messy, cluttered, low quality, shaky camera, poor lighting',
  },
  {
    id: 'closeup',
    label: 'Close-up',
    labelJa: 'クローズアップ',
    description: '商品のディテールを強調するクローズアップ',
    prompt:
      'Extreme close-up macro shot of product details, highlighting texture and quality, shallow depth of field, professional product photography, premium feel, luxurious presentation',
    negativePrompt:
      'blurry, out of focus, low resolution, grainy, overexposed',
  },
  {
    id: 'dynamic',
    label: 'Dynamic',
    labelJa: 'ダイナミック',
    description: 'エネルギッシュで躍動感のある動画',
    prompt:
      'Product in dynamic motion, energetic camera movement, fast-paced editing feel, vibrant colors, modern and trendy style, TikTok viral aesthetic, eye-catching visuals',
    negativePrompt:
      'static, boring, dull colors, slow, amateur looking',
  },
  {
    id: 'minimal',
    label: 'Minimal',
    labelJa: 'ミニマル',
    description: '洗練されたミニマルデザイン',
    prompt:
      'Product on pure white background, minimalist aesthetic, clean lines, elegant simplicity, Apple-style presentation, premium branding feel, studio lighting',
    negativePrompt:
      'cluttered, busy background, low quality, amateur',
  },
  {
    id: 'transformation',
    label: 'Transformation',
    labelJa: '変化',
    description: 'Before/After効果を強調',
    prompt:
      'Smooth transformation effect showing product benefits, before and after comparison, satisfying visual change, clean transition, professional quality',
    negativePrompt:
      'abrupt cuts, low quality, confusing, unclear comparison',
  },
  {
    id: 'custom',
    label: 'Custom',
    labelJa: 'カスタム',
    description: '自由にプロンプトを入力',
    prompt: '',
    negativePrompt: 'blurry, low quality, distorted, amateur',
  },
]

// プリセットIDからプリセットを取得
export function getPreset(presetId: string): PromptPreset | undefined {
  return KLING_PRESETS.find(p => p.id === presetId)
}

// 商品情報を含めたプロンプトを生成
export function buildPrompt(
  preset: PromptPreset,
  productName: string,
  customPrompt?: string
): string {
  if (preset.id === 'custom' && customPrompt) {
    return customPrompt
  }

  // プリセットのプロンプトに商品名を追加
  return `${preset.prompt}, featuring "${productName}"`
}

// デフォルトのネガティブプロンプト
export const DEFAULT_NEGATIVE_PROMPT =
  'blurry, low quality, distorted, ugly, amateur, shaky, overexposed, underexposed, watermark, text, logo'
