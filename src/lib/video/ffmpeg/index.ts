// UGC加工エフェクト
export {
  processUGCVideo,
  applyTikTokUGCPreset,
  applyReviewUGCPreset,
  applyVintageUGCPreset,
  type UGCEffect,
  type UGCProcessingOptions,
  type UGCProcessingResult,
} from './ugc-processor'

// 動画トリミング
export {
  trimVideo,
  extractFirstSeconds,
  extractLastSeconds,
  getVideoDuration,
  getVideoMetadata,
  type TrimOptions,
  type TrimResult,
} from './trimmer'

// 動画結合
export {
  mergeVideos,
  concatTwo,
  mergeWithFade,
  type MergeOptions,
  type MergeResult,
} from './merger'

// 字幕焼き込み
export {
  burnSubtitles,
  addTextOverlay,
  addMultipleTextOverlays,
  generateProductSubtitles,
  type SubtitleEntry,
  type SubtitleStyle,
  type BurnSubtitleOptions,
  type TextOverlayOptions,
  type BurnSubtitleResult,
} from './subtitle'

// コーデック変換
export {
  convertVideo,
  convertForPlatform,
  convertToH265,
  convertToVertical,
  convertToHorizontal,
  convertToSquare,
  compressVideo,
  extractAudio,
  PLATFORM_PRESETS,
  type VideoCodec,
  type AudioCodec,
  type VideoPreset,
  type ConvertOptions,
  type ConvertResult,
  type PlatformPreset,
} from './converter'
