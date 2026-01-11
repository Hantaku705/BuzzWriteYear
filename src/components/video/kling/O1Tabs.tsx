'use client'

import { Image, Wand2, Film, Frame, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { O1_TABS, type O1Tab, type TagItem } from '@/lib/video/kling/tags'

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Image,
  Wand2,
  Film,
  Frame,
}

interface O1TabsProps {
  activeTab: O1Tab
  onTabChange: (tab: O1Tab) => void
  onReset: () => void
  tagCounts?: Record<O1Tab, number>
  disabled?: boolean
}

export function O1Tabs({
  activeTab,
  onTabChange,
  onReset,
  tagCounts = {} as Record<O1Tab, number>,
  disabled = false,
}: O1TabsProps) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-3">
      {/* タブ一覧 */}
      <div className="flex items-center gap-1">
        {O1_TABS.map((tab) => {
          const Icon = ICONS[tab.icon]
          const isActive = activeTab === tab.id
          const count = tagCounts[tab.id] || 0

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              disabled={disabled}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg transition-all',
                'text-sm font-medium',
                'hover:bg-zinc-800/50 active:scale-[0.98]',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                isActive
                  ? 'bg-pink-500/20 text-pink-300 border border-pink-500/50'
                  : 'text-zinc-400 border border-transparent'
              )}
            >
              {Icon && <Icon className="h-4 w-4" />}
              <span className="hidden sm:inline">{tab.labelJa}</span>
              {count > 0 && (
                <Badge
                  variant="secondary"
                  className={cn(
                    'h-5 min-w-5 px-1.5 text-xs',
                    isActive ? 'bg-pink-500/30 text-pink-200' : 'bg-zinc-700 text-zinc-300'
                  )}
                >
                  {count}
                </Badge>
              )}
            </button>
          )
        })}
      </div>

      {/* リセットボタン */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onReset}
        disabled={disabled}
        className="text-zinc-400 hover:text-zinc-200"
      >
        <RotateCcw className="h-4 w-4 mr-1" />
        リセット
      </Button>
    </div>
  )
}

/** タブの説明を表示 */
export function O1TabDescription({ tab }: { tab: O1Tab }) {
  const config = O1_TABS.find((t) => t.id === tab)
  if (!config) return null

  return (
    <p className="text-xs text-zinc-500 mt-1">
      {config.description}
    </p>
  )
}
