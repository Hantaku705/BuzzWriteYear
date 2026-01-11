/**
 * Kling AI Style Presets
 * スタイル変換と背景変更のプリセット定義
 */

// ============================================
// スタイルプリセット
// ============================================

export interface StylePreset {
  id: string
  name: string
  nameJa: string
  description: string
  descriptionJa: string
  category: 'artistic' | 'realistic' | 'abstract' | 'retro' | 'custom'
  prompt: string
  negativePrompt?: string
  referenceImageUrl?: string  // スタイル参照画像（将来用）
}

export const STYLE_PRESETS: StylePreset[] = [
  // Artistic系
  {
    id: 'anime',
    name: 'Anime',
    nameJa: 'アニメ調',
    description: 'Japanese anime style with cel-shading',
    descriptionJa: '日本のアニメスタイル、セルシェーディング',
    category: 'artistic',
    prompt: 'anime style, cel-shaded, vibrant colors, clean lines, japanese animation, studio ghibli inspired',
    negativePrompt: 'photorealistic, 3D render, blurry',
  },
  {
    id: 'oil_painting',
    name: 'Oil Painting',
    nameJa: '油絵風',
    description: 'Classical oil painting style',
    descriptionJa: '古典的な油絵タッチ',
    category: 'artistic',
    prompt: 'oil painting style, classical art, rich textures, artistic brushstrokes, museum quality, renaissance style',
    negativePrompt: 'digital, flat, cartoon',
  },
  {
    id: 'watercolor',
    name: 'Watercolor',
    nameJa: '水彩画風',
    description: 'Soft watercolor painting style',
    descriptionJa: '柔らかい水彩画タッチ',
    category: 'artistic',
    prompt: 'watercolor painting, soft edges, flowing colors, artistic, delicate, transparent layers, wet on wet technique',
    negativePrompt: 'sharp edges, digital, hard lines',
  },
  {
    id: 'sketch',
    name: 'Pencil Sketch',
    nameJa: 'スケッチ風',
    description: 'Hand-drawn pencil sketch style',
    descriptionJa: '手描きの鉛筆スケッチ風',
    category: 'artistic',
    prompt: 'pencil sketch, hand drawn, artistic sketch, graphite, line art, hatching, crosshatching',
    negativePrompt: 'color, photorealistic, smooth',
  },
  {
    id: 'ukiyoe',
    name: 'Ukiyo-e',
    nameJa: '浮世絵風',
    description: 'Japanese woodblock print style',
    descriptionJa: '日本の木版画スタイル',
    category: 'artistic',
    prompt: 'ukiyo-e style, japanese woodblock print, flat colors, bold outlines, hokusai inspired, edo period art',
    negativePrompt: '3D, photorealistic, western art',
  },

  // Realistic系
  {
    id: 'cinematic',
    name: 'Cinematic',
    nameJa: 'シネマティック',
    description: 'Hollywood movie quality look',
    descriptionJa: 'ハリウッド映画のような高品質な見た目',
    category: 'realistic',
    prompt: 'cinematic look, movie quality, professional color grading, dramatic lighting, film grain, anamorphic lens',
    negativePrompt: 'amateur, low quality, flat lighting',
  },
  {
    id: 'hdr',
    name: 'HDR Vivid',
    nameJa: 'HDR鮮明',
    description: 'High dynamic range with vivid colors',
    descriptionJa: '高ダイナミックレンジで鮮やかな色彩',
    category: 'realistic',
    prompt: 'HDR photography, vivid colors, high contrast, dynamic range, enhanced details, professional photo',
    negativePrompt: 'flat, dull, low contrast',
  },
  {
    id: 'soft_focus',
    name: 'Soft Focus',
    nameJa: 'ソフトフォーカス',
    description: 'Dreamy soft focus effect',
    descriptionJa: '夢のようなソフトフォーカス効果',
    category: 'realistic',
    prompt: 'soft focus, dreamy, gentle blur, romantic, soft lighting, ethereal glow',
    negativePrompt: 'sharp, harsh, high contrast',
  },

  // Abstract系
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    nameJa: 'サイバーパンク',
    description: 'Neon-lit futuristic style',
    descriptionJa: 'ネオンと未来的スタイル',
    category: 'abstract',
    prompt: 'cyberpunk aesthetic, neon lights, futuristic, dystopian atmosphere, blade runner style, holographic, glitch effects',
    negativePrompt: 'natural, organic, vintage',
  },
  {
    id: 'vaporwave',
    name: 'Vaporwave',
    nameJa: 'ヴェイパーウェイブ',
    description: '80s/90s retro-futuristic aesthetic',
    descriptionJa: '80年代/90年代のレトロフューチャー',
    category: 'abstract',
    prompt: 'vaporwave aesthetic, synthwave, pink and blue, retro-futuristic, 80s style, grid patterns, sunset gradients',
    negativePrompt: 'realistic, modern, minimalist',
  },
  {
    id: 'lego',
    name: 'LEGO Style',
    nameJa: 'LEGO風',
    description: 'Everything made of LEGO bricks',
    descriptionJa: '全てがLEGOブロックでできている',
    category: 'abstract',
    prompt: 'lego brick style, everything made of lego, plastic blocks, colorful bricks, toy aesthetic',
    negativePrompt: 'realistic, smooth, organic',
  },
  {
    id: 'pixel_art',
    name: 'Pixel Art',
    nameJa: 'ドット絵',
    description: 'Retro pixel art style',
    descriptionJa: 'レトロなドット絵スタイル',
    category: 'abstract',
    prompt: 'pixel art style, 8-bit, retro game graphics, pixelated, low resolution, dithering',
    negativePrompt: 'smooth, high resolution, anti-aliased',
  },

  // Retro系
  {
    id: 'vintage_film',
    name: 'Vintage Film',
    nameJa: 'ヴィンテージフィルム',
    description: 'Old film camera look with grain',
    descriptionJa: '古いフィルムカメラの見た目、粒子感',
    category: 'retro',
    prompt: 'vintage film, old camera, film grain, light leaks, faded colors, nostalgic, 1970s photography',
    negativePrompt: 'digital, clean, modern',
  },
  {
    id: 'polaroid',
    name: 'Polaroid',
    nameJa: 'ポラロイド風',
    description: 'Instant camera polaroid style',
    descriptionJa: 'インスタントカメラのポラロイド風',
    category: 'retro',
    prompt: 'polaroid style, instant photo, white border, slightly faded, warm tones, nostalgic',
    negativePrompt: 'digital, sharp, modern colors',
  },
  {
    id: 'noir',
    name: 'Film Noir',
    nameJa: 'フィルムノワール',
    description: 'Black and white noir style',
    descriptionJa: '白黒のフィルムノワールスタイル',
    category: 'retro',
    prompt: 'film noir style, black and white, high contrast, dramatic shadows, moody lighting, 1940s aesthetic',
    negativePrompt: 'color, bright, cheerful',
  },
  {
    id: 'sepia',
    name: 'Sepia Tone',
    nameJa: 'セピア調',
    description: 'Warm sepia toned vintage look',
    descriptionJa: '温かみのあるセピア調のビンテージ',
    category: 'retro',
    prompt: 'sepia tone, vintage photograph, old photo, warm brown tones, antique, historical',
    negativePrompt: 'color, modern, digital',
  },

  // Custom
  {
    id: 'custom',
    name: 'Custom Style',
    nameJa: 'カスタムスタイル',
    description: 'Use your own style reference or prompt',
    descriptionJa: '自分のスタイル参照画像またはプロンプトを使用',
    category: 'custom',
    prompt: '',
  },
]

// ============================================
// 背景プリセット
// ============================================

export interface BackgroundPreset {
  id: string
  name: string
  nameJa: string
  description: string
  descriptionJa: string
  category: 'studio' | 'nature' | 'urban' | 'abstract' | 'custom'
  prompt: string
  referenceImageUrl?: string
}

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  // Studio系
  {
    id: 'studio_white',
    name: 'White Studio',
    nameJa: '白スタジオ',
    description: 'Clean white studio background',
    descriptionJa: 'クリーンな白いスタジオ背景',
    category: 'studio',
    prompt: 'clean white studio background, professional lighting, product photography, seamless white backdrop',
  },
  {
    id: 'studio_black',
    name: 'Black Studio',
    nameJa: '黒スタジオ',
    description: 'Elegant black studio background',
    descriptionJa: 'エレガントな黒いスタジオ背景',
    category: 'studio',
    prompt: 'elegant black studio background, dramatic lighting, luxury product photography, dark backdrop',
  },
  {
    id: 'studio_gradient',
    name: 'Gradient Studio',
    nameJa: 'グラデーションスタジオ',
    description: 'Smooth gradient background',
    descriptionJa: 'スムーズなグラデーション背景',
    category: 'studio',
    prompt: 'smooth gradient background, modern studio, soft color transition, professional backdrop',
  },
  {
    id: 'studio_neon',
    name: 'Neon Studio',
    nameJa: 'ネオンスタジオ',
    description: 'Neon-lit studio with colorful lights',
    descriptionJa: 'カラフルなネオンライトのスタジオ',
    category: 'studio',
    prompt: 'neon studio background, colorful neon lights, modern aesthetic, glowing backdrop, RGB lighting',
  },

  // Nature系
  {
    id: 'nature_sunset',
    name: 'Sunset Beach',
    nameJa: '夕焼けビーチ',
    description: 'Beautiful sunset beach scene',
    descriptionJa: '美しい夕焼けのビーチシーン',
    category: 'nature',
    prompt: 'beautiful sunset beach, golden hour, cinematic, ocean waves, warm colors, romantic atmosphere',
  },
  {
    id: 'nature_forest',
    name: 'Forest',
    nameJa: '森林',
    description: 'Lush green forest background',
    descriptionJa: '緑豊かな森林背景',
    category: 'nature',
    prompt: 'lush green forest, natural lighting, trees, foliage, peaceful nature, bokeh background',
  },
  {
    id: 'nature_mountain',
    name: 'Mountain View',
    nameJa: '山の景色',
    description: 'Majestic mountain landscape',
    descriptionJa: '雄大な山の風景',
    category: 'nature',
    prompt: 'majestic mountain landscape, dramatic sky, epic scenery, nature backdrop, adventure',
  },
  {
    id: 'nature_sakura',
    name: 'Cherry Blossoms',
    nameJa: '桜',
    description: 'Japanese cherry blossom scene',
    descriptionJa: '日本の桜のシーン',
    category: 'nature',
    prompt: 'cherry blossom trees, sakura, pink petals, spring in japan, romantic, soft lighting',
  },

  // Urban系
  {
    id: 'urban_city',
    name: 'City Skyline',
    nameJa: '都会のスカイライン',
    description: 'Modern city skyline at night',
    descriptionJa: '夜の近代的な都市のスカイライン',
    category: 'urban',
    prompt: 'modern city skyline, night scene, city lights, urban backdrop, skyscrapers, metropolitan',
  },
  {
    id: 'urban_street',
    name: 'City Street',
    nameJa: '都市のストリート',
    description: 'Busy city street scene',
    descriptionJa: '賑やかな都市のストリートシーン',
    category: 'urban',
    prompt: 'city street, urban scene, shops, pedestrians, vibrant, street photography backdrop',
  },
  {
    id: 'urban_tokyo',
    name: 'Tokyo Neon',
    nameJa: '東京ネオン',
    description: 'Tokyo neon-lit street at night',
    descriptionJa: '夜の東京のネオン街',
    category: 'urban',
    prompt: 'tokyo street at night, neon signs, shibuya, japanese city, cyberpunk atmosphere, rain reflection',
  },
  {
    id: 'urban_cafe',
    name: 'Cozy Cafe',
    nameJa: 'おしゃれカフェ',
    description: 'Warm and cozy cafe interior',
    descriptionJa: '温かくて居心地の良いカフェ内装',
    category: 'urban',
    prompt: 'cozy cafe interior, warm lighting, coffee shop, wooden furniture, comfortable atmosphere',
  },

  // Abstract系
  {
    id: 'abstract_holographic',
    name: 'Holographic',
    nameJa: 'ホログラフィック',
    description: 'Futuristic holographic background',
    descriptionJa: '未来的なホログラフィック背景',
    category: 'abstract',
    prompt: 'holographic background, iridescent, rainbow reflections, futuristic, sci-fi aesthetic',
  },
  {
    id: 'abstract_marble',
    name: 'Marble Texture',
    nameJa: '大理石テクスチャ',
    description: 'Elegant marble texture background',
    descriptionJa: 'エレガントな大理石テクスチャ背景',
    category: 'abstract',
    prompt: 'marble texture background, elegant, luxury, white and gold veins, premium aesthetic',
  },
  {
    id: 'abstract_particles',
    name: 'Particle Effect',
    nameJa: 'パーティクル効果',
    description: 'Floating particles and bokeh',
    descriptionJa: '浮遊するパーティクルとボケ',
    category: 'abstract',
    prompt: 'floating particles, bokeh lights, magical atmosphere, sparkles, dreamy background',
  },
  {
    id: 'abstract_geometric',
    name: 'Geometric Pattern',
    nameJa: '幾何学模様',
    description: 'Modern geometric pattern background',
    descriptionJa: 'モダンな幾何学模様背景',
    category: 'abstract',
    prompt: 'geometric pattern background, modern design, shapes, minimalist, contemporary art',
  },

  // Custom
  {
    id: 'custom',
    name: 'Custom Background',
    nameJa: 'カスタム背景',
    description: 'Use your own background description or image',
    descriptionJa: '自分の背景説明または画像を使用',
    category: 'custom',
    prompt: '',
  },
]

// ============================================
// ヘルパー関数
// ============================================

export function getStylePreset(id: string): StylePreset | undefined {
  return STYLE_PRESETS.find(p => p.id === id)
}

export function getBackgroundPreset(id: string): BackgroundPreset | undefined {
  return BACKGROUND_PRESETS.find(p => p.id === id)
}

export function getStylePresetsByCategory(category: StylePreset['category']): StylePreset[] {
  return STYLE_PRESETS.filter(p => p.category === category)
}

export function getBackgroundPresetsByCategory(category: BackgroundPreset['category']): BackgroundPreset[] {
  return BACKGROUND_PRESETS.filter(p => p.category === category)
}

/**
 * スタイルプロンプトを生成
 */
export function buildStylePrompt(
  basePrompt: string,
  stylePreset?: StylePreset,
  customStylePrompt?: string
): string {
  const stylePart = customStylePrompt || stylePreset?.prompt || ''
  if (!stylePart) return basePrompt
  return `${basePrompt}, ${stylePart}`
}

/**
 * 背景プロンプトを生成
 */
export function buildBackgroundPrompt(
  basePrompt: string,
  backgroundPreset?: BackgroundPreset,
  customBackgroundPrompt?: string
): string {
  const bgPart = customBackgroundPrompt || backgroundPreset?.prompt || ''
  if (!bgPart) return basePrompt
  return `${basePrompt}, background: ${bgPart}`
}
