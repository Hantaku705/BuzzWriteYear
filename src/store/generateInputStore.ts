import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { KlingModelVersion, KlingAspectRatio, KlingQuality } from '@/types/database'

type ModeType = 'text-to-video' | 'image-to-video' | 'motion-control' | 'elements'

interface GenerateInputState {
  // 生成モード
  activeMode: ModeType
  setActiveMode: (mode: ModeType) => void

  // モデル設定
  model: KlingModelVersion
  setModel: (model: KlingModelVersion) => void

  // 品質設定
  quality: KlingQuality
  setQuality: (quality: KlingQuality) => void

  // 動画時間
  duration: 5 | 10
  setDuration: (duration: 5 | 10) => void

  // アスペクト比
  aspect: KlingAspectRatio
  setAspect: (aspect: KlingAspectRatio) => void

  // 音声同期
  enableAudioSync: boolean
  setEnableAudioSync: (enable: boolean) => void

  // 最後に使用したプロンプト
  lastPrompt: string
  setLastPrompt: (prompt: string) => void

  // UGCスタイルID
  selectedUGCStyleId: string | null
  setSelectedUGCStyleId: (id: string | null) => void

  // リセット
  reset: () => void
}

const defaultState = {
  activeMode: 'image-to-video' as ModeType,
  model: '2.6' as KlingModelVersion,
  quality: 'pro' as KlingQuality,
  duration: 5 as 5 | 10,
  aspect: '9:16' as KlingAspectRatio,
  enableAudioSync: true,
  lastPrompt: '',
  selectedUGCStyleId: null as string | null,
}

export const useGenerateInputStore = create<GenerateInputState>()(
  persist(
    (set) => ({
      ...defaultState,

      setActiveMode: (mode) => set({ activeMode: mode }),
      setModel: (model) => set({ model }),
      setQuality: (quality) => set({ quality }),
      setDuration: (duration) => set({ duration }),
      setAspect: (aspect) => set({ aspect }),
      setEnableAudioSync: (enable) => set({ enableAudioSync: enable }),
      setLastPrompt: (prompt) => set({ lastPrompt: prompt }),
      setSelectedUGCStyleId: (id) => set({ selectedUGCStyleId: id }),

      reset: () => set(defaultState),
    }),
    {
      name: 'generate-input-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        activeMode: state.activeMode,
        model: state.model,
        quality: state.quality,
        duration: state.duration,
        aspect: state.aspect,
        enableAudioSync: state.enableAudioSync,
        lastPrompt: state.lastPrompt,
        selectedUGCStyleId: state.selectedUGCStyleId,
      }),
    }
  )
)
