'use client'

import { useState } from 'react'
import { X, User, Image as ImageIcon, Video, Loader2, AlertCircle } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { TAG_COLORS, TAG_TYPE_LABELS, type TagItem, type TagType } from '@/lib/video/kling/tags'

const TYPE_ICONS: Record<TagType, React.ComponentType<{ className?: string }>> = {
  subject: User,
  image: ImageIcon,
  video: Video,
}

interface TagThumbnailProps {
  tag: TagItem
  onRemove: () => void
  onNameChange?: (name: string) => void
  size?: 'sm' | 'md' | 'lg'
  showTypeLabel?: boolean
  disabled?: boolean
}

export function TagThumbnail({
  tag,
  onRemove,
  onNameChange,
  size = 'md',
  showTypeLabel = true,
  disabled = false,
}: TagThumbnailProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(tag.name)

  const Icon = TYPE_ICONS[tag.type]
  const colorClass = TAG_COLORS[tag.type]
  const typeLabel = TAG_TYPE_LABELS[tag.type]

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-20 h-20',
    lg: 'w-24 h-24',
  }

  const handleNameSubmit = () => {
    if (editName.trim() && onNameChange) {
      onNameChange(editName.trim())
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSubmit()
    } else if (e.key === 'Escape') {
      setEditName(tag.name)
      setIsEditing(false)
    }
  }

  return (
    <div className="relative group flex flex-col items-center gap-1">
      {/* サムネイル */}
      <div
        className={cn(
          'relative rounded-lg border-2 overflow-hidden',
          'bg-zinc-800/50 transition-all',
          colorClass,
          sizeClasses[size],
          tag.isUploading && 'animate-pulse',
          tag.error && 'border-red-500'
        )}
      >
        {/* 画像/動画プレビュー */}
        {tag.thumbnailUrl ? (
          tag.type === 'video' ? (
            <video
              src={tag.thumbnailUrl}
              className="w-full h-full object-cover"
              muted
              loop
              playsInline
              onMouseEnter={(e) => e.currentTarget.play()}
              onMouseLeave={(e) => {
                e.currentTarget.pause()
                e.currentTarget.currentTime = 0
              }}
            />
          ) : (
            <img
              src={tag.thumbnailUrl}
              alt={tag.name}
              className="w-full h-full object-cover"
            />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon className="h-6 w-6 text-zinc-500" />
          </div>
        )}

        {/* アップロード中 */}
        {tag.isUploading && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-1">
            <Loader2 className="h-5 w-5 animate-spin text-white" />
            {tag.uploadProgress !== undefined && (
              <Progress value={tag.uploadProgress} className="w-3/4 h-1" />
            )}
          </div>
        )}

        {/* エラー表示 */}
        {tag.error && (
          <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
            <AlertCircle className="h-5 w-5 text-red-400" />
          </div>
        )}

        {/* 削除ボタン */}
        {!disabled && !tag.isUploading && (
          <button
            onClick={onRemove}
            className={cn(
              'absolute -top-1.5 -right-1.5 p-0.5 rounded-full',
              'bg-zinc-900 border border-zinc-700',
              'opacity-0 group-hover:opacity-100 transition-opacity',
              'hover:bg-red-500/20 hover:border-red-500'
            )}
          >
            <X className="h-3 w-3 text-zinc-400 hover:text-red-400" />
          </button>
        )}

        {/* タイプラベル */}
        {showTypeLabel && (
          <div
            className={cn(
              'absolute bottom-0 left-0 right-0 px-1 py-0.5',
              'text-[10px] text-center truncate',
              'bg-black/60 backdrop-blur-sm',
              tag.type === 'subject' && 'text-blue-300',
              tag.type === 'image' && 'text-green-300',
              tag.type === 'video' && 'text-purple-300'
            )}
          >
            {typeLabel.ja}
          </div>
        )}
      </div>

      {/* タグ名（編集可能） */}
      <div className="w-full text-center">
        {isEditing && onNameChange ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={handleKeyDown}
            autoFocus
            className={cn(
              'w-full px-1 py-0.5 text-xs text-center rounded',
              'bg-zinc-800 border border-zinc-600',
              'focus:outline-none focus:border-pink-500'
            )}
          />
        ) : (
          <button
            onClick={() => onNameChange && setIsEditing(true)}
            disabled={!onNameChange || disabled}
            className={cn(
              'w-full px-1 py-0.5 text-xs truncate rounded',
              'text-zinc-300 hover:text-white',
              onNameChange && !disabled && 'hover:bg-zinc-800 cursor-text'
            )}
            title={tag.name}
          >
            @{tag.name}
          </button>
        )}
      </div>
    </div>
  )
}

/** 複数タグのグリッド表示 */
export function TagThumbnailGrid({
  tags,
  onRemove,
  onNameChange,
  size = 'md',
  disabled = false,
}: {
  tags: TagItem[]
  onRemove: (tagId: string) => void
  onNameChange?: (tagId: string, name: string) => void
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {tags.map((tag) => (
        <TagThumbnail
          key={tag.id}
          tag={tag}
          onRemove={() => onRemove(tag.id)}
          onNameChange={onNameChange ? (name) => onNameChange(tag.id, name) : undefined}
          size={size}
          disabled={disabled}
        />
      ))}
    </div>
  )
}
