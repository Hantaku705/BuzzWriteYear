/**
 * UGCスタイル統合ロジック
 * 複数のサンプル分析結果を統合し、スタイルプロファイルと生成パラメータを作成
 */

import type {
  SampleAnalysisResult,
  StyleProfile,
  GenerationParams,
  CameraWorkProfile,
  EditStyleProfile,
  VisualStyleProfile,
  MotionStyleProfile,
  AudioStyleProfile,
} from '@/types/ugc-style'

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent'

/** 統合プロンプト */
const SYNTHESIS_PROMPT = `I have analyzed multiple UGC (User Generated Content) videos. Based on these analyses, create a unified style profile that captures the common patterns and dominant characteristics.

Sample Analyses:
{ANALYSES}

Create a synthesized style profile with:
1. Identify patterns present in 50%+ of samples as "dominant"
2. Calculate averages for numeric values
3. Merge and deduplicate lists
4. Determine the most common values for categorical fields

Return ONLY a valid JSON object:

{
  "styleProfile": {
    "cameraWork": {
      "dominantStyle": "handheld | tripod | gimbal | mixed",
      "shakeIntensity": 0.0-1.0,
      "zoomUsage": 0.0-1.0,
      "panUsage": 0.0-1.0,
      "commonMovements": ["array of common movements"]
    },
    "editStyle": {
      "pacing": "slow | medium | fast",
      "avgClipDuration": number,
      "transitionTypes": ["array"],
      "hasJumpCuts": boolean,
      "beatSync": boolean
    },
    "visualStyle": {
      "colorTone": "warm | cool | neutral",
      "filterLook": "string",
      "contrast": "low | medium | high",
      "saturation": "muted | natural | vibrant",
      "dominantColors": ["hex colors or descriptive names"]
    },
    "motionStyle": {
      "intensity": "subtle | moderate | dynamic",
      "subjectMovement": "static | subtle | active",
      "cameraMovement": "rare | occasional | frequent"
    },
    "audioStyle": {
      "hasBGM": boolean,
      "hasVoiceover": boolean,
      "musicGenre": "string",
      "sfxUsage": "none | light | moderate | heavy"
    }
  },
  "generationParams": {
    "klingPromptSuffix": "style description for Kling AI prompt",
    "klingNegativePrompt": "things to avoid",
    "motionPresetId": "suggested motion preset ID or null",
    "cameraPresetId": "suggested camera preset ID or null",
    "ffmpegEffects": {
      "effects": ["camera_shake", "film_grain", "vintage_filter", "phone_quality", "selfie_mode"],
      "intensity": "light | medium | heavy"
    }
  },
  "keywords": ["array of style keywords"],
  "overallVibe": "A natural language description of the overall style"
}

Important:
- Be specific based on the actual sample data
- For klingPromptSuffix, create a detailed style description that can be appended to any prompt
- For ffmpegEffects, only include effects that match the analyzed style
- Return ONLY the JSON, no explanation`

/**
 * Gemini APIで分析結果を統合
 */
export async function synthesizeStyleWithGemini(
  analyses: SampleAnalysisResult[],
  apiKey: string
): Promise<{
  styleProfile: StyleProfile
  generationParams: GenerationParams
  keywords: string[]
  overallVibe: string
}> {
  const prompt = SYNTHESIS_PROMPT.replace('{ANALYSES}', JSON.stringify(analyses, null, 2))

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4096,
      }
    })
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`Gemini API error: ${response.status} - ${JSON.stringify(errorData)}`)
  }

  const result = await response.json()

  if (!result.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new Error(`Unexpected Gemini response: ${JSON.stringify(result)}`)
  }

  const text = result.candidates[0].content.parts[0].text

  // JSONをパース
  let jsonText = text.trim()
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }

  try {
    const parsed = JSON.parse(jsonText)
    return validateAndNormalizeSynthesis(parsed)
  } catch (e) {
    throw new Error(`Failed to parse synthesis response: ${e}. Response: ${text}`)
  }
}

/**
 * ローカルで分析結果を統合（Gemini APIなしのフォールバック）
 */
export function synthesizeStyleLocally(
  analyses: SampleAnalysisResult[]
): {
  styleProfile: StyleProfile
  generationParams: GenerationParams
  keywords: string[]
  overallVibe: string
} {
  if (analyses.length === 0) {
    throw new Error('No analyses provided')
  }

  // カメラワーク統合
  const cameraWork = synthesizeCameraWork(analyses)

  // 編集スタイル統合
  const editStyle = synthesizeEditStyle(analyses)

  // 視覚スタイル統合
  const visualStyle = synthesizeVisualStyle(analyses)

  // モーションスタイル統合
  const motionStyle = synthesizeMotionStyle(analyses)

  // 音声スタイル統合
  const audioStyle = synthesizeAudioStyle(analyses)

  const styleProfile: StyleProfile = {
    cameraWork,
    editStyle,
    visualStyle,
    motionStyle,
    audioStyle,
  }

  // 生成パラメータを導出
  const generationParams = deriveGenerationParams(styleProfile)

  // キーワード抽出
  const keywords = extractKeywords(styleProfile, analyses)

  // 全体の雰囲気
  const overallVibe = generateOverallVibe(styleProfile)

  return { styleProfile, generationParams, keywords, overallVibe }
}

/**
 * カメラワーク統合
 */
function synthesizeCameraWork(analyses: SampleAnalysisResult[]): CameraWorkProfile {
  const stabilities = analyses.map(a => a.cameraWork.stability)
  const movements = analyses.flatMap(a => a.cameraWork.movements)

  // 安定性の頻度カウント
  const stabilityCounts = countOccurrences(stabilities)
  let dominantStyle: CameraWorkProfile['dominantStyle'] = 'handheld'
  if (stabilityCounts['stable'] > analyses.length * 0.5) {
    dominantStyle = 'tripod'
  } else if (stabilityCounts['shaky'] > analyses.length * 0.5) {
    dominantStyle = 'handheld'
  }

  // 動きの頻度から使用度を計算
  const movementCounts = countOccurrences(movements)
  const hasZoom = (movementCounts['zoom_in'] || 0) + (movementCounts['zoom_out'] || 0)
  const hasPan = (movementCounts['pan_left'] || 0) + (movementCounts['pan_right'] || 0)
  const hasShake = movementCounts['shake'] || 0

  return {
    dominantStyle,
    shakeIntensity: Math.min(1, hasShake / analyses.length),
    zoomUsage: Math.min(1, hasZoom / analyses.length),
    panUsage: Math.min(1, hasPan / analyses.length),
    commonMovements: getTopItems(movementCounts, 5),
  }
}

/**
 * 編集スタイル統合
 */
function synthesizeEditStyle(analyses: SampleAnalysisResult[]): EditStyleProfile {
  const pacings = analyses.map(a => a.editStyle.pacing)
  const durations = analyses.map(a => a.editStyle.avgClipDuration).filter(d => d > 0)
  const transitions = analyses.flatMap(a => a.editStyle.transitionTypes)
  const jumpCuts = analyses.filter(a => a.editStyle.hasJumpCuts).length

  return {
    pacing: getMostCommon(pacings) as EditStyleProfile['pacing'] || 'medium',
    avgClipDuration: durations.length > 0 ? durations.reduce((a, b) => a + b) / durations.length : 3,
    transitionTypes: [...new Set(transitions)],
    hasJumpCuts: jumpCuts > analyses.length * 0.5,
    beatSync: false, // 音声分析から推定が難しいのでデフォルトfalse
  }
}

/**
 * 視覚スタイル統合
 */
function synthesizeVisualStyle(analyses: SampleAnalysisResult[]): VisualStyleProfile {
  const contrasts = analyses.map(a => a.visualStyle.contrast)
  const saturations = analyses.map(a => a.visualStyle.saturation)
  const filterLooks = analyses.map(a => a.visualStyle.filterLook)
  const colors = analyses.flatMap(a => a.visualStyle.dominantColors)

  // 色調を推定
  const warmColors = ['warm', 'orange', 'yellow', 'red']
  const coolColors = ['cool', 'blue', 'cyan', 'green']
  const warmCount = filterLooks.filter(f => warmColors.some(w => f.toLowerCase().includes(w))).length
  const coolCount = filterLooks.filter(f => coolColors.some(c => f.toLowerCase().includes(c))).length

  let colorTone: VisualStyleProfile['colorTone'] = 'neutral'
  if (warmCount > coolCount) colorTone = 'warm'
  else if (coolCount > warmCount) colorTone = 'cool'

  return {
    colorTone,
    filterLook: getMostCommon(filterLooks) || 'raw',
    contrast: getMostCommon(contrasts) as VisualStyleProfile['contrast'] || 'medium',
    saturation: getMostCommon(saturations) as VisualStyleProfile['saturation'] || 'natural',
    dominantColors: [...new Set(colors)].slice(0, 5),
  }
}

/**
 * モーションスタイル統合
 */
function synthesizeMotionStyle(analyses: SampleAnalysisResult[]): MotionStyleProfile {
  const intensities = analyses.map(a => a.motionContent.motionIntensity)

  // カメラの動きの頻度
  const cameraMovements = analyses.map(a => a.cameraWork.movements.length)
  const avgCameraMovements = cameraMovements.reduce((a, b) => a + b, 0) / analyses.length

  let cameraMovement: MotionStyleProfile['cameraMovement'] = 'occasional'
  if (avgCameraMovements < 2) cameraMovement = 'rare'
  else if (avgCameraMovements > 4) cameraMovement = 'frequent'

  // 被写体の動き
  const subjectTypes = analyses.map(a => a.motionContent.subjectType)
  const hasPerson = subjectTypes.filter(s => s === 'person' || s === 'both').length
  let subjectMovement: MotionStyleProfile['subjectMovement'] = 'subtle'
  if (hasPerson > analyses.length * 0.5) subjectMovement = 'active'

  return {
    intensity: getMostCommon(intensities) as MotionStyleProfile['intensity'] || 'moderate',
    subjectMovement,
    cameraMovement,
  }
}

/**
 * 音声スタイル統合
 */
function synthesizeAudioStyle(analyses: SampleAnalysisResult[]): AudioStyleProfile {
  const hasBGMCount = analyses.filter(a => a.audio.hasBGM).length
  const hasVoiceoverCount = analyses.filter(a => a.audio.hasVoiceover).length
  const genres = analyses.map(a => a.audio.musicGenre).filter(g => g && g !== 'none')

  return {
    hasBGM: hasBGMCount > analyses.length * 0.5,
    hasVoiceover: hasVoiceoverCount > analyses.length * 0.5,
    musicGenre: getMostCommon(genres) || 'none',
    sfxUsage: 'light', // デフォルト
  }
}

/**
 * 生成パラメータを導出
 */
function deriveGenerationParams(profile: StyleProfile): GenerationParams {
  const promptParts: string[] = []
  const negativeParts: string[] = []

  // カメラワーク
  if (profile.cameraWork.dominantStyle === 'handheld') {
    promptParts.push('handheld camera')
    if (profile.cameraWork.shakeIntensity > 0.5) {
      promptParts.push('subtle camera shake')
    }
  } else if (profile.cameraWork.dominantStyle === 'tripod') {
    promptParts.push('stable tripod shot')
    negativeParts.push('shaky')
  }

  if (profile.cameraWork.zoomUsage > 0.5) {
    promptParts.push('dynamic zoom')
  }

  // 編集スタイル
  if (profile.editStyle.pacing === 'fast') {
    promptParts.push('quick cuts', 'energetic')
    negativeParts.push('slow')
  } else if (profile.editStyle.pacing === 'slow') {
    promptParts.push('slow paced', 'contemplative')
    negativeParts.push('fast cuts')
  }

  // 視覚スタイル
  if (profile.visualStyle.colorTone === 'warm') {
    promptParts.push('warm color grading')
    negativeParts.push('cold colors')
  } else if (profile.visualStyle.colorTone === 'cool') {
    promptParts.push('cool color grading')
    negativeParts.push('warm colors')
  }

  if (profile.visualStyle.filterLook === 'vintage') {
    promptParts.push('vintage look', 'film grain')
  } else if (profile.visualStyle.filterLook === 'cinematic') {
    promptParts.push('cinematic look')
  }

  if (profile.visualStyle.contrast === 'high') {
    promptParts.push('high contrast')
  }

  // モーション
  if (profile.motionStyle.intensity === 'dynamic') {
    promptParts.push('dynamic movement')
    negativeParts.push('static')
  }

  // UGC感
  promptParts.push('authentic UGC feel', 'natural lighting')
  negativeParts.push('professional studio')

  // FFmpegエフェクトを決定
  const effects: GenerationParams['ffmpegEffects']['effects'] = []
  if (profile.cameraWork.shakeIntensity > 0.3) {
    effects.push('camera_shake')
  }
  if (profile.visualStyle.filterLook === 'vintage') {
    effects.push('vintage_filter')
    effects.push('film_grain')
  }
  if (profile.cameraWork.dominantStyle === 'handheld') {
    effects.push('phone_quality')
  }

  // モーションプリセットをマッピング
  let motionPresetId: string | undefined
  if (profile.motionStyle.intensity === 'dynamic') {
    motionPresetId = 'dynamic_burst'
  } else if (profile.motionStyle.intensity === 'subtle') {
    motionPresetId = 'subtle_drift'
  }

  // カメラプリセットをマッピング
  let cameraPresetId: string | undefined
  if (profile.cameraWork.zoomUsage > 0.5) {
    cameraPresetId = 'slow_zoom_in'
  } else if (profile.cameraWork.panUsage > 0.5) {
    cameraPresetId = 'pan_left'
  }

  return {
    klingPromptSuffix: promptParts.join(', '),
    klingNegativePrompt: negativeParts.join(', '),
    motionPresetId,
    cameraPresetId,
    ffmpegEffects: {
      effects,
      intensity: profile.motionStyle.intensity === 'dynamic' ? 'light' : 'medium',
    },
  }
}

/**
 * キーワード抽出
 */
function extractKeywords(profile: StyleProfile, analyses: SampleAnalysisResult[]): string[] {
  const keywords: string[] = []

  // スタイルからキーワード
  keywords.push(profile.cameraWork.dominantStyle)
  keywords.push(profile.editStyle.pacing)
  keywords.push(profile.visualStyle.colorTone)
  keywords.push(profile.motionStyle.intensity)

  if (profile.visualStyle.filterLook !== 'raw') {
    keywords.push(profile.visualStyle.filterLook)
  }

  // 分析からアクションキーワード
  const actions = analyses.flatMap(a => a.motionContent.keyActions)
  const topActions = getTopItems(countOccurrences(actions), 3)
  keywords.push(...topActions)

  // UGC関連
  keywords.push('ugc', 'authentic')

  return [...new Set(keywords)].filter(k => k && k.length > 0)
}

/**
 * 全体の雰囲気を生成
 */
function generateOverallVibe(profile: StyleProfile): string {
  const parts: string[] = []

  // カメラワーク
  if (profile.cameraWork.dominantStyle === 'handheld') {
    parts.push('手持ちカメラで撮影した')
  } else {
    parts.push('安定したカメラワークの')
  }

  // 編集
  if (profile.editStyle.pacing === 'fast') {
    parts.push('テンポの良い')
  } else if (profile.editStyle.pacing === 'slow') {
    parts.push('ゆったりとした')
  }

  // 雰囲気
  if (profile.visualStyle.colorTone === 'warm') {
    parts.push('暖かみのある')
  } else if (profile.visualStyle.colorTone === 'cool') {
    parts.push('クールな')
  }

  parts.push('UGC風動画。')

  // 特徴
  const features: string[] = []
  if (profile.editStyle.hasJumpCuts) features.push('ジャンプカット')
  if (profile.audioStyle.hasBGM) features.push('BGM付き')
  if (profile.audioStyle.hasVoiceover) features.push('ナレーション付き')

  if (features.length > 0) {
    parts.push(features.join('、') + 'が特徴。')
  }

  parts.push('親しみやすく、視聴者に語りかけるような雰囲気。')

  return parts.join('')
}

/**
 * バリデート・正規化
 */
function validateAndNormalizeSynthesis(result: unknown): {
  styleProfile: StyleProfile
  generationParams: GenerationParams
  keywords: string[]
  overallVibe: string
} {
  const r = result as Record<string, unknown>

  // styleProfile
  const sp = (r.styleProfile || {}) as Record<string, unknown>
  const styleProfile: StyleProfile = {
    cameraWork: {
      dominantStyle: (sp.cameraWork as Record<string, unknown>)?.dominantStyle as CameraWorkProfile['dominantStyle'] || 'handheld',
      shakeIntensity: Number((sp.cameraWork as Record<string, unknown>)?.shakeIntensity) || 0,
      zoomUsage: Number((sp.cameraWork as Record<string, unknown>)?.zoomUsage) || 0,
      panUsage: Number((sp.cameraWork as Record<string, unknown>)?.panUsage) || 0,
      commonMovements: ((sp.cameraWork as Record<string, unknown>)?.commonMovements as string[]) || [],
    },
    editStyle: {
      pacing: (sp.editStyle as Record<string, unknown>)?.pacing as EditStyleProfile['pacing'] || 'medium',
      avgClipDuration: Number((sp.editStyle as Record<string, unknown>)?.avgClipDuration) || 3,
      transitionTypes: ((sp.editStyle as Record<string, unknown>)?.transitionTypes as string[]) || [],
      hasJumpCuts: Boolean((sp.editStyle as Record<string, unknown>)?.hasJumpCuts),
      beatSync: Boolean((sp.editStyle as Record<string, unknown>)?.beatSync),
    },
    visualStyle: {
      colorTone: (sp.visualStyle as Record<string, unknown>)?.colorTone as VisualStyleProfile['colorTone'] || 'neutral',
      filterLook: String((sp.visualStyle as Record<string, unknown>)?.filterLook || 'raw'),
      contrast: (sp.visualStyle as Record<string, unknown>)?.contrast as VisualStyleProfile['contrast'] || 'medium',
      saturation: (sp.visualStyle as Record<string, unknown>)?.saturation as VisualStyleProfile['saturation'] || 'natural',
      dominantColors: ((sp.visualStyle as Record<string, unknown>)?.dominantColors as string[]) || [],
    },
    motionStyle: {
      intensity: (sp.motionStyle as Record<string, unknown>)?.intensity as MotionStyleProfile['intensity'] || 'moderate',
      subjectMovement: (sp.motionStyle as Record<string, unknown>)?.subjectMovement as MotionStyleProfile['subjectMovement'] || 'subtle',
      cameraMovement: (sp.motionStyle as Record<string, unknown>)?.cameraMovement as MotionStyleProfile['cameraMovement'] || 'occasional',
    },
    audioStyle: {
      hasBGM: Boolean((sp.audioStyle as Record<string, unknown>)?.hasBGM),
      hasVoiceover: Boolean((sp.audioStyle as Record<string, unknown>)?.hasVoiceover),
      musicGenre: String((sp.audioStyle as Record<string, unknown>)?.musicGenre || 'none'),
      sfxUsage: (sp.audioStyle as Record<string, unknown>)?.sfxUsage as AudioStyleProfile['sfxUsage'] || 'none',
    },
  }

  // generationParams
  const gp = (r.generationParams || {}) as Record<string, unknown>
  const fe = (gp.ffmpegEffects || {}) as Record<string, unknown>
  const generationParams: GenerationParams = {
    klingPromptSuffix: String(gp.klingPromptSuffix || ''),
    klingNegativePrompt: String(gp.klingNegativePrompt || ''),
    motionPresetId: gp.motionPresetId ? String(gp.motionPresetId) : undefined,
    cameraPresetId: gp.cameraPresetId ? String(gp.cameraPresetId) : undefined,
    ffmpegEffects: {
      effects: (fe.effects as GenerationParams['ffmpegEffects']['effects']) || [],
      intensity: fe.intensity as GenerationParams['ffmpegEffects']['intensity'] || 'light',
    },
  }

  return {
    styleProfile,
    generationParams,
    keywords: (r.keywords as string[]) || [],
    overallVibe: String(r.overallVibe || ''),
  }
}

// ============================================
// ユーティリティ関数
// ============================================

function countOccurrences<T>(arr: T[]): Record<string, number> {
  return arr.reduce((acc, item) => {
    const key = String(item)
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {} as Record<string, number>)
}

function getMostCommon<T>(arr: T[]): T | undefined {
  const counts = countOccurrences(arr)
  let maxCount = 0
  let result: T | undefined

  for (const [key, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count
      result = key as unknown as T
    }
  }

  return result
}

function getTopItems(counts: Record<string, number>, n: number): string[] {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key]) => key)
}
