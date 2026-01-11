'use client'

import { useState, useRef, useCallback } from 'react'
import { Plus, Image as ImageIcon, User, Video, Link, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { TagThumbnailGrid } from './TagThumbnail'
import {
  type TagItem,
  type TagType,
  TAG_COLORS,
  TAG_TYPE_LABELS,
  createTag,
} from '@/lib/video/kling/tags'
import { uploadImage, compressImage } from '@/lib/storage/upload'

interface TagGalleryProps {
  tags: TagItem[]
  allowedTypes: TagType[]
  maxTags: number
  onAddTag: (tag: TagItem) => void
  onRemoveTag: (tagId: string) => void
  onUpdateTag: (tagId: string, updates: Partial<TagItem>) => void
  disabled?: boolean
}

export function TagGallery({
  tags,
  allowedTypes,
  maxTags,
  onAddTag,
  onRemoveTag,
  onUpdateTag,
  disabled = false,
}: TagGalleryProps) {
  const [urlInputs, setUrlInputs] = useState<Record<TagType, string>>({
    subject: '',
    image: '',
    video: '',
  })
  const [openPopover, setOpenPopover] = useState<TagType | null>(null)
  const fileInputRefs = useRef<Record<TagType, HTMLInputElement | null>>({
    subject: null,
    image: null,
    video: null,
  })

  const canAddMore = tags.length < maxTags

  const handleFileUpload = useCallback(
    async (file: File, type: TagType) => {
      if (!canAddMore) return

      // タグ名を生成（ファイル名から拡張子を除去）
      const name = file.name.replace(/\.[^/.]+$/, '').slice(0, 20)

      // プレースホルダータグを作成
      const tag = createTag(type, name, undefined, {
        isUploading: true,
        uploadProgress: 0,
      })
      onAddTag(tag)

      try {
        // 画像の場合は圧縮
        let processedFile = file
        if (file.type.startsWith('image/') && file.size > 1024 * 1024) {
          onUpdateTag(tag.id, { uploadProgress: 10 })
          processedFile = await compressImage(file)
        }

        onUpdateTag(tag.id, { uploadProgress: 30 })

        // Supabase Storageにアップロード
        const result = await uploadImage(processedFile, 'kling-references')

        onUpdateTag(tag.id, {
          sourceUrl: result.url,
          thumbnailUrl: result.url,
          isUploading: false,
          uploadProgress: 100,
        })
      } catch (error) {
        onUpdateTag(tag.id, {
          isUploading: false,
          error: error instanceof Error ? error.message : 'アップロード失敗',
        })
      }
    },
    [canAddMore, onAddTag, onUpdateTag]
  )

  const handleUrlAdd = (type: TagType) => {
    const url = urlInputs[type].trim()
    if (!url || !canAddMore) return

    // URL形式のバリデーション
    try {
      new URL(url)
    } catch {
      return
    }

    // タグ名をURLから生成
    const urlObj = new URL(url)
    const name = urlObj.pathname.split('/').pop()?.replace(/\.[^/.]+$/, '').slice(0, 20) || 'media'

    const tag = createTag(type, name, url)
    onAddTag(tag)

    setUrlInputs((prev) => ({ ...prev, [type]: '' }))
    setOpenPopover(null)
  }

  const handleFileInputChange = (type: TagType) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file, type)
    }
    // inputをリセット
    if (e.target) {
      e.target.value = ''
    }
    setOpenPopover(null)
  }

  const handleDrop = useCallback(
    (e: React.DragEvent, type: TagType) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file) {
        handleFileUpload(file, type)
      }
    },
    [handleFileUpload]
  )

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const renderAddButton = (type: TagType) => {
    const Icon = type === 'subject' ? User : type === 'image' ? ImageIcon : Video
    const label = TAG_TYPE_LABELS[type]
    const colorClass = TAG_COLORS[type]
    const acceptTypes = type === 'video' ? 'video/*' : 'image/*'

    return (
      <Popover
        open={openPopover === type}
        onOpenChange={(open) => setOpenPopover(open ? type : null)}
      >
        <PopoverTrigger asChild>
          <button
            disabled={disabled || !canAddMore}
            className={cn(
              'flex flex-col items-center justify-center gap-1',
              'w-20 h-20 rounded-lg border-2 border-dashed',
              'transition-all hover:scale-[1.02] active:scale-[0.98]',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              colorClass,
              openPopover === type && 'ring-2 ring-offset-2 ring-offset-zinc-900'
            )}
          >
            <Plus className="h-5 w-5" />
            <span className="text-xs">{label.ja}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-72 bg-zinc-900 border-zinc-700"
          onDrop={(e) => handleDrop(e, type)}
          onDragOver={handleDragOver}
        >
          <div className="space-y-3">
            {/* ドラッグ&ドロップエリア */}
            <div
              className={cn(
                'flex flex-col items-center justify-center gap-2 p-4',
                'border-2 border-dashed rounded-lg',
                'bg-zinc-800/50 text-zinc-400',
                'cursor-pointer hover:bg-zinc-800 transition-colors',
                colorClass
              )}
              onClick={() => fileInputRefs.current[type]?.click()}
            >
              <Upload className="h-6 w-6" />
              <span className="text-sm">
                クリックまたはドラッグ&ドロップ
              </span>
              <input
                ref={(el) => {
                  fileInputRefs.current[type] = el
                }}
                type="file"
                accept={acceptTypes}
                onChange={handleFileInputChange(type)}
                className="hidden"
              />
            </div>

            {/* URL入力 */}
            <div className="space-y-2">
              <div className="flex items-center gap-1 text-xs text-zinc-400">
                <Link className="h-3 w-3" />
                または URL を入力
              </div>
              <div className="flex gap-2">
                <Input
                  value={urlInputs[type]}
                  onChange={(e) =>
                    setUrlInputs((prev) => ({ ...prev, [type]: e.target.value }))
                  }
                  placeholder="https://..."
                  className="bg-zinc-800 border-zinc-700 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleUrlAdd(type)
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={() => handleUrlAdd(type)}
                  disabled={!urlInputs[type].trim()}
                >
                  追加
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <div className="space-y-3">
      {/* 追加ボタン群 */}
      <div className="flex flex-wrap gap-3">
        {/* 既存タグのサムネイル */}
        <TagThumbnailGrid
          tags={tags}
          onRemove={onRemoveTag}
          onNameChange={(tagId, name) => onUpdateTag(tagId, { name })}
          disabled={disabled}
        />

        {/* 追加ボタン */}
        {canAddMore && allowedTypes.map((type) => (
          <div key={type}>
            {renderAddButton(type)}
          </div>
        ))}
      </div>

      {/* 残り枚数表示 */}
      <div className="text-xs text-zinc-500">
        {tags.length} / {maxTags} 枚
        {!canAddMore && <span className="text-amber-500 ml-2">（上限に達しました）</span>}
      </div>
    </div>
  )
}
