/**
 * 動画生成設定の永続化ストア
 * 前回の設定を保存し、次回モーダル起動時に復元する
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { KlingModelVersion, KlingAspectRatio, KlingQuality } from '@/lib/video/kling/constants'

// Remotionテンプレート
type CompositionId = 'ProductIntro' | 'BeforeAfter' | 'ReviewText' | 'FeatureList'

// 生成モード
type GenerationMode = 'remotion' | 'kling'

export interface VideoSettings {
  // 基本設定
  generationMode: GenerationMode | null

  // Remotion用
  selectedTemplate: CompositionId | null

  // Kling用
  selectedPresetId: string
  modelVersion: KlingModelVersion
  aspectRatio: KlingAspectRatio
  quality: KlingQuality
  klingDuration: 5 | 10
  cfgScale: number
  enableAudio: boolean

  // 最後に使用した商品
  lastProductId: string | null
  lastProductName: string | null

  // 連続生成モード
  autoCloseOnComplete: boolean
}

interface VideoSettingsState extends VideoSettings {
  // アクション
  setGenerationMode: (mode: GenerationMode | null) => void
  setSelectedTemplate: (template: CompositionId | null) => void
  setSelectedPresetId: (presetId: string) => void
  setModelVersion: (version: KlingModelVersion) => void
  setAspectRatio: (ratio: KlingAspectRatio) => void
  setQuality: (quality: KlingQuality) => void
  setKlingDuration: (duration: 5 | 10) => void
  setCfgScale: (scale: number) => void
  setEnableAudio: (enabled: boolean) => void
  setLastProduct: (id: string | null, name: string | null) => void
  setAutoCloseOnComplete: (enabled: boolean) => void

  // 一括更新
  updateKlingSettings: (settings: Partial<Pick<VideoSettings,
    'modelVersion' | 'aspectRatio' | 'quality' | 'klingDuration' | 'cfgScale' | 'enableAudio' | 'selectedPresetId'
  >>) => void

  // リセット
  resetToDefaults: () => void

  // クイック生成可能かどうか
  canQuickGenerate: () => boolean
}

const defaultSettings: VideoSettings = {
  generationMode: 'kling',
  selectedTemplate: null,
  selectedPresetId: 'product_showcase',
  modelVersion: '1.6',
  aspectRatio: '9:16',
  quality: 'standard',
  klingDuration: 5,
  cfgScale: 0.5,
  enableAudio: false,
  lastProductId: null,
  lastProductName: null,
  autoCloseOnComplete: false,
}

export const useVideoSettingsStore = create<VideoSettingsState>()(
  persist(
    (set, get) => ({
      ...defaultSettings,

      setGenerationMode: (mode) => set({ generationMode: mode }),
      setSelectedTemplate: (template) => set({ selectedTemplate: template }),
      setSelectedPresetId: (presetId) => set({ selectedPresetId: presetId }),
      setModelVersion: (version) => set({ modelVersion: version }),
      setAspectRatio: (ratio) => set({ aspectRatio: ratio }),
      setQuality: (quality) => set({ quality: quality }),
      setKlingDuration: (duration) => set({ klingDuration: duration }),
      setCfgScale: (scale) => set({ cfgScale: scale }),
      setEnableAudio: (enabled) => set({ enableAudio: enabled }),
      setLastProduct: (id, name) => set({ lastProductId: id, lastProductName: name }),
      setAutoCloseOnComplete: (enabled) => set({ autoCloseOnComplete: enabled }),

      updateKlingSettings: (settings) => set((state) => ({ ...state, ...settings })),

      resetToDefaults: () => set(defaultSettings),

      canQuickGenerate: () => {
        const state = get()
        return !!(
          state.generationMode === 'kling' &&
          state.lastProductId &&
          state.selectedPresetId
        )
      },
    }),
    {
      name: 'video-settings',
      storage: createJSONStorage(() => localStorage),
      // SSR対応: サーバーサイドではhydrationをスキップ
      skipHydration: true,
    }
  )
)

// クライアントサイドでのみhydrationを実行するためのユーティリティ
export function useHydrateVideoSettings() {
  // useEffectで呼び出す
  if (typeof window !== 'undefined') {
    useVideoSettingsStore.persist.rehydrate()
  }
}
