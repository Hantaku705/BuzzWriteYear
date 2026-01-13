'use client'

import {
  Camera,
  Film,
  Palette,
  Activity,
  Music,
  Sparkles,
  Tag,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { StyleProfile, GenerationParams } from '@/types/ugc-style'

interface UGCStyleProfileProps {
  styleProfile: StyleProfile
  generationParams?: GenerationParams
  keywords?: string[]
  overallVibe?: string
}

interface ProfileSectionProps {
  icon: React.ElementType
  title: string
  color: string
  children: React.ReactNode
  defaultOpen?: boolean
}

function ProfileSection({
  icon: Icon,
  title,
  color,
  children,
  defaultOpen = true,
}: ProfileSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="bg-zinc-800/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-zinc-800 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', color)}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <span className="font-medium text-white">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-zinc-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-zinc-500" />
        )}
      </button>
      {isOpen && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

interface MetricBarProps {
  label: string
  value: number
  max?: number
  color?: string
}

function MetricBar({ label, value, max = 1, color = 'bg-emerald-500' }: MetricBarProps) {
  const percentage = Math.round((value / max) * 100)

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-zinc-400">{label}</span>
        <span className="text-zinc-300">{percentage}%</span>
      </div>
      <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

export function UGCStyleProfile({
  styleProfile,
  generationParams,
  keywords,
  overallVibe,
}: UGCStyleProfileProps) {
  const { cameraWork, editStyle, visualStyle, motionStyle, audioStyle } = styleProfile

  return (
    <div className="space-y-4">
      {/* Overall Vibe */}
      {overallVibe && (
        <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-medium text-white mb-2">全体の雰囲気</h3>
              <p className="text-sm text-zinc-300 leading-relaxed">{overallVibe}</p>
            </div>
          </div>
        </div>
      )}

      {/* Keywords */}
      {keywords && keywords.length > 0 && (
        <div className="bg-zinc-800/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="w-4 h-4 text-zinc-400" />
            <span className="text-sm font-medium text-zinc-300">キーワード</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {keywords.map((keyword) => (
              <span
                key={keyword}
                className="px-3 py-1 bg-zinc-700 text-zinc-300 text-sm rounded-full"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Camera Work */}
      <ProfileSection icon={Camera} title="カメラワーク" color="bg-blue-500/20">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-700/50 rounded-lg p-3">
              <p className="text-xs text-zinc-500 mb-1">スタイル</p>
              <p className="text-sm font-medium text-white capitalize">
                {cameraWork.dominantStyle === 'handheld' ? '手持ち' :
                 cameraWork.dominantStyle === 'tripod' ? '三脚（安定）' :
                 cameraWork.dominantStyle === 'gimbal' ? 'ジンバル' :
                 cameraWork.dominantStyle === 'mixed' ? 'ミックス' :
                 cameraWork.dominantStyle}
              </p>
            </div>
            <div className="bg-zinc-700/50 rounded-lg p-3">
              <p className="text-xs text-zinc-500 mb-1">動きの種類</p>
              <div className="flex flex-wrap gap-1">
                {cameraWork.commonMovements.slice(0, 3).map((movement) => (
                  <span
                    key={movement}
                    className="text-xs px-2 py-0.5 bg-zinc-600 text-zinc-300 rounded"
                  >
                    {movement}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <MetricBar label="手ブレ" value={cameraWork.shakeIntensity} color="bg-blue-500" />
            <MetricBar label="ズーム使用" value={cameraWork.zoomUsage} color="bg-blue-500" />
            <MetricBar label="パン使用" value={cameraWork.panUsage} color="bg-blue-500" />
          </div>
        </div>
      </ProfileSection>

      {/* Edit Style */}
      <ProfileSection icon={Film} title="編集スタイル" color="bg-purple-500/20">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-zinc-700/50 rounded-lg p-3 text-center">
              <p className="text-xs text-zinc-500 mb-1">テンポ</p>
              <p className="text-sm font-medium text-white capitalize">
                {editStyle.pacing === 'fast' ? '速い' :
                 editStyle.pacing === 'medium' ? '普通' :
                 editStyle.pacing === 'slow' ? 'ゆっくり' :
                 editStyle.pacing}
              </p>
            </div>
            <div className="bg-zinc-700/50 rounded-lg p-3 text-center">
              <p className="text-xs text-zinc-500 mb-1">平均クリップ</p>
              <p className="text-sm font-medium text-white">
                {editStyle.avgClipDuration.toFixed(1)}秒
              </p>
            </div>
            <div className="bg-zinc-700/50 rounded-lg p-3 text-center">
              <p className="text-xs text-zinc-500 mb-1">トランジション</p>
              <p className="text-sm font-medium text-white">
                {editStyle.transitionTypes.slice(0, 2).join(', ')}
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg',
              editStyle.hasJumpCuts ? 'bg-purple-500/20 text-purple-400' : 'bg-zinc-700 text-zinc-500'
            )}>
              <span className="text-sm">ジャンプカット</span>
              <span className="text-xs">{editStyle.hasJumpCuts ? 'あり' : 'なし'}</span>
            </div>
            <div className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg',
              editStyle.beatSync ? 'bg-purple-500/20 text-purple-400' : 'bg-zinc-700 text-zinc-500'
            )}>
              <span className="text-sm">ビート同期</span>
              <span className="text-xs">{editStyle.beatSync ? 'あり' : 'なし'}</span>
            </div>
          </div>
        </div>
      </ProfileSection>

      {/* Visual Style */}
      <ProfileSection icon={Palette} title="ビジュアルスタイル" color="bg-pink-500/20">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-700/50 rounded-lg p-3">
              <p className="text-xs text-zinc-500 mb-1">色調</p>
              <p className="text-sm font-medium text-white capitalize">
                {visualStyle.colorTone === 'warm' ? '暖色' :
                 visualStyle.colorTone === 'cool' ? '寒色' :
                 visualStyle.colorTone === 'neutral' ? 'ニュートラル' :
                 visualStyle.colorTone}
              </p>
            </div>
            <div className="bg-zinc-700/50 rounded-lg p-3">
              <p className="text-xs text-zinc-500 mb-1">フィルター</p>
              <p className="text-sm font-medium text-white capitalize">
                {visualStyle.filterLook === 'vintage' ? 'ヴィンテージ' :
                 visualStyle.filterLook === 'modern' ? 'モダン' :
                 visualStyle.filterLook === 'natural' ? 'ナチュラル' :
                 visualStyle.filterLook === 'cinematic' ? 'シネマティック' :
                 visualStyle.filterLook}
              </p>
            </div>
            <div className="bg-zinc-700/50 rounded-lg p-3">
              <p className="text-xs text-zinc-500 mb-1">コントラスト</p>
              <p className="text-sm font-medium text-white capitalize">
                {visualStyle.contrast === 'high' ? '高い' :
                 visualStyle.contrast === 'medium' ? '普通' :
                 visualStyle.contrast === 'low' ? '低い' :
                 visualStyle.contrast}
              </p>
            </div>
            <div className="bg-zinc-700/50 rounded-lg p-3">
              <p className="text-xs text-zinc-500 mb-1">彩度</p>
              <p className="text-sm font-medium text-white capitalize">
                {visualStyle.saturation === 'vibrant' ? '鮮やか' :
                 visualStyle.saturation === 'muted' ? '落ち着いた' :
                 visualStyle.saturation === 'natural' ? 'ナチュラル' :
                 visualStyle.saturation}
              </p>
            </div>
          </div>
          {visualStyle.dominantColors.length > 0 && (
            <div>
              <p className="text-xs text-zinc-500 mb-2">主要な色</p>
              <div className="flex gap-2">
                {visualStyle.dominantColors.map((color) => (
                  <div
                    key={color}
                    className="w-8 h-8 rounded-lg border border-zinc-600"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </ProfileSection>

      {/* Motion Style */}
      <ProfileSection icon={Activity} title="モーションスタイル" color="bg-orange-500/20">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-zinc-700/50 rounded-lg p-3 text-center">
            <p className="text-xs text-zinc-500 mb-1">強度</p>
            <p className="text-sm font-medium text-white capitalize">
              {motionStyle.intensity === 'dynamic' ? 'ダイナミック' :
               motionStyle.intensity === 'moderate' ? '普通' :
               motionStyle.intensity === 'subtle' ? '控えめ' :
               motionStyle.intensity}
            </p>
          </div>
          <div className="bg-zinc-700/50 rounded-lg p-3 text-center">
            <p className="text-xs text-zinc-500 mb-1">被写体の動き</p>
            <p className="text-sm font-medium text-white capitalize">
              {motionStyle.subjectMovement === 'active' ? '活発' :
               motionStyle.subjectMovement === 'subtle' ? '控えめ' :
               motionStyle.subjectMovement === 'static' ? '静止' :
               motionStyle.subjectMovement}
            </p>
          </div>
          <div className="bg-zinc-700/50 rounded-lg p-3 text-center">
            <p className="text-xs text-zinc-500 mb-1">カメラの動き</p>
            <p className="text-sm font-medium text-white capitalize">
              {motionStyle.cameraMovement === 'frequent' ? '多い' :
               motionStyle.cameraMovement === 'occasional' ? '時々' :
               motionStyle.cameraMovement === 'rare' ? 'まれ' :
               motionStyle.cameraMovement}
            </p>
          </div>
        </div>
      </ProfileSection>

      {/* Audio Style */}
      <ProfileSection icon={Music} title="オーディオスタイル" color="bg-cyan-500/20">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-700/50 rounded-lg p-3">
              <p className="text-xs text-zinc-500 mb-1">BGM</p>
              <p className="text-sm font-medium text-white">
                {audioStyle.hasBGM ? 'あり' : 'なし'}
              </p>
            </div>
            <div className="bg-zinc-700/50 rounded-lg p-3">
              <p className="text-xs text-zinc-500 mb-1">ナレーション</p>
              <p className="text-sm font-medium text-white">
                {audioStyle.hasVoiceover ? 'あり' : 'なし'}
              </p>
            </div>
          </div>
          {audioStyle.hasBGM && audioStyle.musicGenre && (
            <div className="bg-zinc-700/50 rounded-lg p-3">
              <p className="text-xs text-zinc-500 mb-1">音楽ジャンル</p>
              <p className="text-sm font-medium text-white capitalize">
                {audioStyle.musicGenre}
              </p>
            </div>
          )}
          <div className="bg-zinc-700/50 rounded-lg p-3">
            <p className="text-xs text-zinc-500 mb-1">効果音</p>
            <p className="text-sm font-medium text-white capitalize">
              {audioStyle.sfxUsage === 'heavy' ? '多い' :
               audioStyle.sfxUsage === 'moderate' ? '普通' :
               audioStyle.sfxUsage === 'light' ? '少なめ' :
               audioStyle.sfxUsage === 'none' ? 'なし' :
               audioStyle.sfxUsage}
            </p>
          </div>
        </div>
      </ProfileSection>

      {/* Generation Parameters */}
      {generationParams && (
        <ProfileSection icon={Sparkles} title="生成パラメータ" color="bg-emerald-500/20" defaultOpen={false}>
          <div className="space-y-4">
            {generationParams.klingPromptSuffix && (
              <div className="bg-zinc-700/50 rounded-lg p-3">
                <p className="text-xs text-zinc-500 mb-2">Klingプロンプト追加</p>
                <p className="text-sm text-zinc-300 font-mono">
                  {generationParams.klingPromptSuffix}
                </p>
              </div>
            )}
            {generationParams.klingNegativePrompt && (
              <div className="bg-zinc-700/50 rounded-lg p-3">
                <p className="text-xs text-zinc-500 mb-2">ネガティブプロンプト</p>
                <p className="text-sm text-zinc-300 font-mono">
                  {generationParams.klingNegativePrompt}
                </p>
              </div>
            )}
            {generationParams.ffmpegEffects?.effects && generationParams.ffmpegEffects.effects.length > 0 && (
              <div className="bg-zinc-700/50 rounded-lg p-3">
                <p className="text-xs text-zinc-500 mb-2">FFmpegエフェクト</p>
                <div className="flex flex-wrap gap-2">
                  {generationParams.ffmpegEffects.effects.map((effect) => (
                    <span
                      key={effect}
                      className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded"
                    >
                      {effect}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ProfileSection>
      )}
    </div>
  )
}
