/**
 * Kling O1 自然言語組み合わせUI - 型定義
 *
 * Kling公式の4つのメイン機能:
 * 1. 画像/主体参考 - Elements + Subject
 * 2. プロンプト変換 - V2V Edit
 * 3. 動画参考 - Motion/Camera Reference
 * 4. フレーム - Dual Keyframe
 */

// ============================================
// タブ定義
// ============================================

/** Kling O1の4つのメインタブ */
export type O1Tab = 'image-subject' | 'prompt-transform' | 'video-reference' | 'frames'

/** O1タブ設定 */
export interface O1TabConfig {
  id: O1Tab
  label: string
  labelJa: string
  icon: string
  description: string
  allowedTagTypes: TagType[]
  maxTags: number
}

export const O1_TABS: O1TabConfig[] = [
  {
    id: 'image-subject',
    label: 'Images/Subjects',
    labelJa: '画像/主体参考',
    icon: 'Image',
    description: '画像と主体を@で組み合わせて動画生成（最大7枚）',
    allowedTagTypes: ['subject', 'image'],
    maxTags: 7,
  },
  {
    id: 'prompt-transform',
    label: 'Prompt Transform',
    labelJa: 'プロンプト変換',
    icon: 'Wand2',
    description: '動画をアップロードして自然言語で編集',
    allowedTagTypes: ['video', 'subject', 'image'],
    maxTags: 8, // 1動画 + 7画像
  },
  {
    id: 'video-reference',
    label: 'Video Reference',
    labelJa: '動画参考',
    icon: 'Film',
    description: 'カメラワーク・動きを参考に新規動画生成',
    allowedTagTypes: ['video', 'subject', 'image'],
    maxTags: 8,
  },
  {
    id: 'frames',
    label: 'Frames',
    labelJa: 'フレーム',
    icon: 'Frame',
    description: 'スタート&エンド画像を指定して中間を補間',
    allowedTagTypes: ['image'],
    maxTags: 2, // 開始・終了の2枚のみ
  },
]

// ============================================
// タグ定義
// ============================================

/**
 * タグタイプ（Kling公式準拠の色分け）
 * - subject: 青タグ - 主体（一貫性維持、4パターン画像+説明）
 * - image: 緑タグ - 画像（単発参照）
 * - video: 紫タグ - 動画（参照用）
 */
export type TagType = 'subject' | 'image' | 'video'

/** タグアイテム */
export interface TagItem {
  id: string
  type: TagType
  name: string // 表示名（@で参照）
  thumbnailUrl?: string // サムネイル
  sourceUrl?: string // 元URL
  description?: string // 主体の説明文（Subjectのみ）
  variants?: string[] // 他アングル画像URL（Subjectのみ、最大4枚）
  isUploading?: boolean
  uploadProgress?: number
  error?: string
  createdAt: number // 作成日時（ソート用）
}

/** タグの色設定（Kling公式準拠） */
export const TAG_COLORS: Record<TagType, string> = {
  subject: 'bg-blue-500/20 border-blue-500 text-blue-300', // 青
  image: 'bg-green-500/20 border-green-500 text-green-300', // 緑
  video: 'bg-purple-500/20 border-purple-500 text-purple-300', // 紫
}

/** タグのアイコン */
export const TAG_ICONS: Record<TagType, string> = {
  subject: 'User', // 主体
  image: 'Image', // 画像
  video: 'Video', // 動画
}

/** タグタイプのラベル */
export const TAG_TYPE_LABELS: Record<TagType, { en: string; ja: string }> = {
  subject: { en: 'Subject', ja: '主体' },
  image: { en: 'Image', ja: '画像' },
  video: { en: 'Video', ja: '動画' },
}

// ============================================
// ヘルパー関数
// ============================================

/** 新しいタグを作成 */
export function createTag(
  type: TagType,
  name: string,
  sourceUrl?: string,
  options?: Partial<TagItem>
): TagItem {
  return {
    id: crypto.randomUUID(),
    type,
    name,
    sourceUrl,
    thumbnailUrl: sourceUrl, // デフォルトでは同じURL
    createdAt: Date.now(),
    ...options,
  }
}

/** タブ設定を取得 */
export function getTabConfig(tabId: O1Tab): O1TabConfig | undefined {
  return O1_TABS.find((tab) => tab.id === tabId)
}

/** タブにタグを追加可能か判定 */
export function canAddTagToTab(tabId: O1Tab, currentTags: TagItem[], tagType: TagType): boolean {
  const config = getTabConfig(tabId)
  if (!config) return false

  // タグタイプが許可されているか
  if (!config.allowedTagTypes.includes(tagType)) return false

  // 最大数に達していないか
  return currentTags.length < config.maxTags
}

/** タグタイプでフィルタ */
export function filterTagsByType(tags: TagItem[], types: TagType[]): TagItem[] {
  return tags.filter((tag) => types.includes(tag.type))
}

/** プロンプト内の@メンションを検出 */
export function extractMentions(prompt: string): string[] {
  const regex = /@([^\s@]+)/g
  const matches = prompt.match(regex)
  return matches ? matches.map((m) => m.slice(1)) : []
}

/** @メンションをタグ情報に置換 */
export function replaceMentionsWithContext(prompt: string, tags: TagItem[]): string {
  let result = prompt

  tags.forEach((tag) => {
    const mention = `@${tag.name}`
    const replacement = `[${tag.type}:${tag.name}]`
    result = result.split(mention).join(replacement)
  })

  return result
}

// ============================================
// フレームタブ専用
// ============================================

/** フレームタブ用の画像設定 */
export interface FrameImages {
  startFrame: string | null
  endFrame: string | null
}

/** フレーム画像のラベル */
export const FRAME_LABELS = {
  start: { en: 'Start Frame', ja: 'スタート画像' },
  end: { en: 'End Frame', ja: 'エンド画像' },
}
