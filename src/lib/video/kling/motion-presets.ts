/**
 * Kling AI Motion & Camera Presets
 * モーション参照とカメラワークのプリセット定義
 */

import type { CameraControl } from './constants'

// ============================================
// モーションプリセット
// ============================================

export interface MotionPreset {
  id: string
  name: string
  nameJa: string
  description: string
  descriptionJa: string
  category: 'product' | 'human' | 'subtle' | 'dynamic' | 'custom'
  promptSuffix: string  // プロンプトに追加するモーション指示
  referenceVideoUrl?: string  // プリセット参照動画（将来用）
}

export const MOTION_PRESETS: MotionPreset[] = [
  // Product系
  {
    id: 'product_rotate',
    name: 'Product Rotation',
    nameJa: '商品回転',
    description: 'Smooth 360-degree rotation showcasing the product',
    descriptionJa: '商品が滑らかに回転して全体を見せる',
    category: 'product',
    promptSuffix: 'smooth rotation, 360 degree turn, product showcase, spinning slowly',
  },
  {
    id: 'product_float',
    name: 'Product Float',
    nameJa: '商品浮遊',
    description: 'Product gently floating in space',
    descriptionJa: '商品が空中にふわふわと浮かぶ',
    category: 'product',
    promptSuffix: 'floating gently, levitating, soft hover motion, weightless',
  },
  {
    id: 'product_reveal',
    name: 'Product Reveal',
    nameJa: '商品登場',
    description: 'Dramatic product reveal with light effects',
    descriptionJa: 'ドラマチックに商品が登場',
    category: 'product',
    promptSuffix: 'dramatic reveal, emerging from light, spotlight effect, grand entrance',
  },

  // Subtle系
  {
    id: 'slow_zoom',
    name: 'Slow Zoom',
    nameJa: 'ゆっくりズーム',
    description: 'Gradual zoom in for dramatic effect',
    descriptionJa: '徐々にズームインしてドラマチックに',
    category: 'subtle',
    promptSuffix: 'slow zoom in, gradual approach, cinematic zoom',
  },
  {
    id: 'gentle_sway',
    name: 'Gentle Sway',
    nameJa: 'ゆらゆら揺れる',
    description: 'Natural gentle swaying motion',
    descriptionJa: '自然な揺らぎ動作',
    category: 'subtle',
    promptSuffix: 'gentle sway, soft movement, breathing motion, subtle oscillation',
  },
  {
    id: 'parallax',
    name: 'Parallax Effect',
    nameJa: '視差効果',
    description: 'Depth-creating parallax movement',
    descriptionJa: '奥行きを感じさせる視差効果',
    category: 'subtle',
    promptSuffix: 'parallax depth, layered movement, 3D effect, depth perception',
  },

  // Human系
  {
    id: 'hand_gesture',
    name: 'Hand Gesture',
    nameJa: 'ハンドジェスチャー',
    description: 'Hand presenting or pointing to product',
    descriptionJa: '手で商品を指し示す',
    category: 'human',
    promptSuffix: 'hand gesture, presenting motion, pointing, showing product',
  },
  {
    id: 'unboxing',
    name: 'Unboxing Motion',
    nameJa: '開封モーション',
    description: 'Opening package to reveal product',
    descriptionJa: 'パッケージを開けて商品を見せる',
    category: 'human',
    promptSuffix: 'unboxing, opening package, revealing contents, unwrapping',
  },
  {
    id: 'using_product',
    name: 'Using Product',
    nameJa: '商品使用',
    description: 'Demonstrating product usage',
    descriptionJa: '商品の使い方をデモンストレーション',
    category: 'human',
    promptSuffix: 'using product, demonstrating, hands-on, product in action',
  },

  // Dynamic系
  {
    id: 'dynamic_burst',
    name: 'Dynamic Burst',
    nameJa: 'ダイナミックバースト',
    description: 'Energetic explosive movement',
    descriptionJa: 'エネルギッシュな爆発的動き',
    category: 'dynamic',
    promptSuffix: 'dynamic motion, burst effect, energetic, explosive movement',
  },
  {
    id: 'speed_motion',
    name: 'Speed Motion',
    nameJa: 'スピードモーション',
    description: 'Fast-paced action movement',
    descriptionJa: '高速でアクション感のある動き',
    category: 'dynamic',
    promptSuffix: 'fast motion, speed blur, quick movement, dynamic action',
  },
  {
    id: 'dance_simple',
    name: 'Simple Dance',
    nameJa: 'シンプルダンス',
    description: 'Rhythmic dancing movement',
    descriptionJa: 'リズミカルなダンス動作',
    category: 'dynamic',
    promptSuffix: 'dancing, rhythmic movement, musical motion, groove',
  },

  // Custom
  {
    id: 'custom',
    name: 'Custom Reference',
    nameJa: 'カスタム参照',
    description: 'Use your own reference video',
    descriptionJa: '自分の参照動画を使用',
    category: 'custom',
    promptSuffix: '',
  },
]

// ============================================
// カメラプリセット
// ============================================

export interface CameraPreset {
  id: string
  name: string
  nameJa: string
  description: string
  descriptionJa: string
  category: 'basic' | 'cinematic' | 'product' | 'custom'
  controls: CameraControl[]
  promptSuffix: string
}

export const CAMERA_PRESETS: CameraPreset[] = [
  // Basic系
  {
    id: 'slow_zoom_in',
    name: 'Slow Zoom In',
    nameJa: 'スローズームイン',
    description: 'Gradually zoom into the subject',
    descriptionJa: '被写体に徐々にズームイン',
    category: 'basic',
    controls: [{ type: 'zoom', direction: 'in', speed: 'slow', amount: 30 }],
    promptSuffix: 'slow zoom in, gradual approach, focusing closer',
  },
  {
    id: 'slow_zoom_out',
    name: 'Slow Zoom Out',
    nameJa: 'スローズームアウト',
    description: 'Gradually zoom out to reveal more',
    descriptionJa: '徐々にズームアウトして全体を見せる',
    category: 'basic',
    controls: [{ type: 'zoom', direction: 'out', speed: 'slow', amount: 30 }],
    promptSuffix: 'slow zoom out, revealing wider view, pulling back',
  },
  {
    id: 'pan_left',
    name: 'Pan Left',
    nameJa: '左パン',
    description: 'Camera pans from right to left',
    descriptionJa: 'カメラが右から左へパン',
    category: 'basic',
    controls: [{ type: 'pan', direction: 'left', speed: 'medium', amount: 50 }],
    promptSuffix: 'camera panning left, horizontal movement left',
  },
  {
    id: 'pan_right',
    name: 'Pan Right',
    nameJa: '右パン',
    description: 'Camera pans from left to right',
    descriptionJa: 'カメラが左から右へパン',
    category: 'basic',
    controls: [{ type: 'pan', direction: 'right', speed: 'medium', amount: 50 }],
    promptSuffix: 'camera panning right, horizontal movement right',
  },
  {
    id: 'tilt_up',
    name: 'Tilt Up',
    nameJa: 'ティルトアップ',
    description: 'Camera tilts upward',
    descriptionJa: 'カメラが上に傾く',
    category: 'basic',
    controls: [{ type: 'tilt', direction: 'up', speed: 'medium', amount: 40 }],
    promptSuffix: 'camera tilting up, vertical movement upward, looking up',
  },
  {
    id: 'tilt_down',
    name: 'Tilt Down',
    nameJa: 'ティルトダウン',
    description: 'Camera tilts downward',
    descriptionJa: 'カメラが下に傾く',
    category: 'basic',
    controls: [{ type: 'tilt', direction: 'down', speed: 'medium', amount: 40 }],
    promptSuffix: 'camera tilting down, vertical movement downward, looking down',
  },

  // Cinematic系
  {
    id: 'orbit',
    name: 'Orbit',
    nameJa: 'オービット（回り込み）',
    description: 'Camera orbits around the subject',
    descriptionJa: 'カメラが被写体の周りを回る',
    category: 'cinematic',
    controls: [
      { type: 'truck', direction: 'right', speed: 'slow', amount: 60 },
      { type: 'pan', direction: 'left', speed: 'slow', amount: 60 },
    ],
    promptSuffix: 'orbiting camera, circular movement around subject, 360 view',
  },
  {
    id: 'dramatic_reveal',
    name: 'Dramatic Reveal',
    nameJa: 'ドラマチック登場',
    description: 'Dramatic reveal with zoom and tilt',
    descriptionJa: 'ズームとティルトでドラマチックに登場',
    category: 'cinematic',
    controls: [
      { type: 'zoom', direction: 'in', speed: 'slow', amount: 40 },
      { type: 'tilt', direction: 'down', speed: 'slow', amount: 20 },
    ],
    promptSuffix: 'dramatic reveal, cinematic approach, grand unveiling',
  },
  {
    id: 'dolly_zoom',
    name: 'Dolly Zoom',
    nameJa: 'ドリーズーム',
    description: 'Vertigo effect - dolly out while zooming in',
    descriptionJa: 'めまい効果 - 後退しながらズームイン',
    category: 'cinematic',
    controls: [
      { type: 'dolly', direction: 'out', speed: 'medium', amount: 30 },
      { type: 'zoom', direction: 'in', speed: 'medium', amount: 50 },
    ],
    promptSuffix: 'dolly zoom, vertigo effect, hitchcock zoom, surreal perspective',
  },
  {
    id: 'crane_up',
    name: 'Crane Up',
    nameJa: 'クレーンアップ',
    description: 'Camera rises up while looking down',
    descriptionJa: 'カメラが上昇しながら見下ろす',
    category: 'cinematic',
    controls: [
      { type: 'dolly', direction: 'up', speed: 'slow', amount: 50 },
      { type: 'tilt', direction: 'down', speed: 'slow', amount: 30 },
    ],
    promptSuffix: 'crane shot, rising camera, aerial view, birds eye perspective',
  },

  // Product系
  {
    id: 'product_showcase',
    name: 'Product Showcase',
    nameJa: '商品ショーケース',
    description: 'Perfect for product videos - zoom + slight orbit',
    descriptionJa: '商品動画に最適 - ズーム＋軽い回り込み',
    category: 'product',
    controls: [
      { type: 'zoom', direction: 'in', speed: 'slow', amount: 25 },
      { type: 'truck', direction: 'right', speed: 'slow', amount: 15 },
    ],
    promptSuffix: 'product showcase, elegant camera movement, commercial style',
  },
  {
    id: 'product_detail',
    name: 'Product Detail',
    nameJa: '商品ディテール',
    description: 'Close-up detail shot with slow zoom',
    descriptionJa: 'クローズアップでディテールを見せる',
    category: 'product',
    controls: [
      { type: 'zoom', direction: 'in', speed: 'slow', amount: 60 },
    ],
    promptSuffix: 'macro detail, close up, focusing on details, product inspection',
  },
  {
    id: 'product_reveal_360',
    name: 'Product 360 Reveal',
    nameJa: '商品360度紹介',
    description: 'Full 360 degree product reveal',
    descriptionJa: '商品を360度見せる',
    category: 'product',
    controls: [
      { type: 'truck', direction: 'right', speed: 'medium', amount: 100 },
      { type: 'pan', direction: 'left', speed: 'medium', amount: 100 },
    ],
    promptSuffix: '360 degree view, full rotation, all angles, complete showcase',
  },

  // Custom
  {
    id: 'custom',
    name: 'Custom Reference',
    nameJa: 'カスタム参照',
    description: 'Use your own reference video for camera work',
    descriptionJa: '自分の参照動画を使用',
    category: 'custom',
    controls: [],
    promptSuffix: '',
  },
]

// ============================================
// ヘルパー関数
// ============================================

export function getMotionPreset(id: string): MotionPreset | undefined {
  return MOTION_PRESETS.find(p => p.id === id)
}

export function getCameraPreset(id: string): CameraPreset | undefined {
  return CAMERA_PRESETS.find(p => p.id === id)
}

export function getMotionPresetsByCategory(category: MotionPreset['category']): MotionPreset[] {
  return MOTION_PRESETS.filter(p => p.category === category)
}

export function getCameraPresetsByCategory(category: CameraPreset['category']): CameraPreset[] {
  return CAMERA_PRESETS.filter(p => p.category === category)
}

/**
 * カメラ制御をプロンプトに変換
 */
export function cameraControlsToPrompt(controls: CameraControl[]): string {
  return controls.map(c => {
    const parts: string[] = [c.type]
    if (c.direction) parts.push(c.direction)
    if (c.speed) parts.push(c.speed)
    return parts.join(' ')
  }).join(', ')
}
