'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { User, Image as ImageIcon, Video } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  type TagItem,
  type TagType,
  TAG_COLORS,
  TAG_TYPE_LABELS,
} from '@/lib/video/kling/tags'

const TYPE_ICONS: Record<TagType, React.ComponentType<{ className?: string }>> = {
  subject: User,
  image: ImageIcon,
  video: Video,
}

interface MentionTextareaProps {
  value: string
  onChange: (value: string) => void
  tags: TagItem[]
  placeholder?: string
  disabled?: boolean
  className?: string
}

interface Suggestion {
  tag: TagItem
  displayText: string
}

export function MentionTextarea({
  value,
  onChange,
  tags,
  placeholder = '@でタグを参照してプロンプトを入力...',
  disabled = false,
  className,
}: MentionTextareaProps) {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [mentionStart, setMentionStart] = useState<number | null>(null)
  const [cursorPosition, setCursorPosition] = useState(0)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // @検出とサジェスト表示
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value
      const cursorPos = e.target.selectionStart || 0
      onChange(newValue)
      setCursorPosition(cursorPos)

      // カーソル前のテキストで@を検出
      const textBeforeCursor = newValue.substring(0, cursorPos)
      const atMatch = textBeforeCursor.match(/@([^\s@]*)$/)

      if (atMatch) {
        const filter = atMatch[1].toLowerCase()
        const matchingTags = tags.filter(
          (tag) =>
            tag.name.toLowerCase().includes(filter) ||
            TAG_TYPE_LABELS[tag.type].ja.toLowerCase().includes(filter)
        )

        if (matchingTags.length > 0) {
          setSuggestions(
            matchingTags.map((tag) => ({
              tag,
              displayText: `@${tag.name}`,
            }))
          )
          setMentionStart(cursorPos - atMatch[1].length - 1)
          setShowSuggestions(true)
          setSelectedIndex(0)
        } else {
          setShowSuggestions(false)
        }
      } else {
        setShowSuggestions(false)
      }
    },
    [tags, onChange]
  )

  // サジェストを選択
  const insertMention = useCallback(
    (suggestion: Suggestion) => {
      if (mentionStart === null) return

      const beforeMention = value.substring(0, mentionStart)
      const afterCursor = value.substring(cursorPosition)
      const newValue = `${beforeMention}${suggestion.displayText} ${afterCursor}`

      onChange(newValue)
      setShowSuggestions(false)
      setMentionStart(null)

      // カーソルを挿入後の位置に移動
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          const newCursorPos = mentionStart + suggestion.displayText.length + 1
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
          textareaRef.current.focus()
        }
      })
    },
    [value, mentionStart, cursorPosition, onChange]
  )

  // キーボード操作
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showSuggestions) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => (prev + 1) % suggestions.length)
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length)
          break
        case 'Enter':
        case 'Tab':
          if (suggestions[selectedIndex]) {
            e.preventDefault()
            insertMention(suggestions[selectedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          setShowSuggestions(false)
          break
      }
    },
    [showSuggestions, suggestions, selectedIndex, insertMention]
  )

  // 外側クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ハイライト付きプレビュー（@タグを色分け表示）
  const renderHighlightedPreview = () => {
    if (!value) return null

    const parts: React.ReactNode[] = []
    let lastIndex = 0
    const regex = /@([^\s@]+)/g
    let match

    while ((match = regex.exec(value)) !== null) {
      // @の前のテキスト
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {value.substring(lastIndex, match.index)}
          </span>
        )
      }

      // @メンション
      const tagName = match[1]
      const tag = tags.find((t) => t.name === tagName)
      const colorClass = tag ? TAG_COLORS[tag.type] : 'bg-zinc-700 text-zinc-300'

      parts.push(
        <span
          key={`mention-${match.index}`}
          className={cn('px-1 py-0.5 rounded text-sm', colorClass)}
        >
          @{tagName}
        </span>
      )

      lastIndex = match.index + match[0].length
    }

    // 残りのテキスト
    if (lastIndex < value.length) {
      parts.push(<span key={`text-${lastIndex}`}>{value.substring(lastIndex)}</span>)
    }

    return parts
  }

  return (
    <div className={cn('relative', className)}>
      {/* メインのTextarea */}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'bg-zinc-800 border-zinc-700 min-h-[100px]',
          'focus:border-pink-500 focus:ring-pink-500/20'
        )}
      />

      {/* サジェストポップアップ */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className={cn(
            'absolute left-0 right-0 mt-1 z-50',
            'bg-zinc-900 border border-zinc-700 rounded-lg shadow-lg',
            'max-h-60 overflow-y-auto'
          )}
        >
          {suggestions.map((suggestion, index) => {
            const Icon = TYPE_ICONS[suggestion.tag.type]
            const colorClass = TAG_COLORS[suggestion.tag.type]

            return (
              <button
                key={suggestion.tag.id}
                onClick={() => insertMention(suggestion)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2',
                  'text-left transition-colors',
                  index === selectedIndex
                    ? 'bg-pink-500/20 text-white'
                    : 'hover:bg-zinc-800 text-zinc-300'
                )}
              >
                {/* サムネイル */}
                <div
                  className={cn(
                    'w-8 h-8 rounded border flex items-center justify-center overflow-hidden',
                    colorClass
                  )}
                >
                  {suggestion.tag.thumbnailUrl ? (
                    <img
                      src={suggestion.tag.thumbnailUrl}
                      alt={suggestion.tag.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>

                {/* タグ情報 */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{suggestion.displayText}</div>
                  <div className="text-xs text-zinc-500">
                    {TAG_TYPE_LABELS[suggestion.tag.type].ja}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* プレビュー表示（タグが存在する場合） */}
      {tags.length > 0 && value && (
        <div className="mt-2 p-2 bg-zinc-800/50 rounded-lg text-sm text-zinc-400">
          <div className="text-xs text-zinc-500 mb-1">プレビュー:</div>
          <div className="whitespace-pre-wrap">{renderHighlightedPreview()}</div>
        </div>
      )}

      {/* ヒント */}
      <div className="mt-1 text-xs text-zinc-500">
        <span className="text-pink-400">@</span> を入力してタグを参照
      </div>
    </div>
  )
}
