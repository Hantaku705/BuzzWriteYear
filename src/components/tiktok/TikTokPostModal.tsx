'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTikTokAccounts } from '@/hooks/useTikTokAccounts'
import { usePostToTikTok, usePostStatus } from '@/hooks/useTikTokPost'
import type { TikTokPrivacyLevel } from '@/types/tiktok'
import { Loader2, Upload, Globe, Users, Lock, Plus, CheckCircle2, XCircle } from 'lucide-react'

interface TikTokPostModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  videoId: string
  videoTitle: string
  productName?: string
  onSuccess?: (postId: string) => void
}

const PRIVACY_OPTIONS = [
  { value: 'PUBLIC_TO_EVERYONE', label: 'すべての人に公開', icon: Globe },
  { value: 'MUTUAL_FOLLOW_FRIENDS', label: '友達のみ', icon: Users },
  { value: 'SELF_ONLY', label: '自分のみ', icon: Lock },
] as const

const POPULAR_HASHTAGS = [
  '#おすすめ',
  '#PR',
  '#商品レビュー',
  '#買ってよかった',
  '#TikTokMadeMeBuyIt',
]

export function TikTokPostModal({
  open,
  onOpenChange,
  videoId,
  videoTitle,
  productName,
  onSuccess,
}: TikTokPostModalProps) {
  const router = useRouter()
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [caption, setCaption] = useState('')
  const [hashtags, setHashtags] = useState<string[]>([])
  const [hashtagInput, setHashtagInput] = useState('')
  const [privacyLevel, setPrivacyLevel] = useState<TikTokPrivacyLevel>('PUBLIC_TO_EVERYONE')
  const [postId, setPostId] = useState<string | null>(null)

  const { data: accounts, isLoading: isLoadingAccounts } = useTikTokAccounts()
  const { mutate: postToTikTok, isPending: isPosting } = usePostToTikTok()
  const { data: postStatus } = usePostStatus(postId)

  // 初期キャプション設定
  useEffect(() => {
    if (productName && !caption) {
      setCaption(`${productName}を紹介します！`)
    }
  }, [productName, caption])

  // 最初のアカウントを自動選択
  useEffect(() => {
    if (accounts && accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id)
    }
  }, [accounts, selectedAccountId])

  // 投稿完了時の処理
  useEffect(() => {
    if (postStatus?.status === 'completed') {
      toast.success('TikTokへの投稿が完了しました')
      onSuccess?.(postId!)
      onOpenChange(false)
      router.refresh()
    } else if (postStatus?.status === 'failed') {
      toast.error(`投稿に失敗しました: ${postStatus.errorMessage || '不明なエラー'}`)
      setPostId(null)
    }
  }, [postStatus, postId, onSuccess, onOpenChange, router])

  const handleAddHashtag = (tag: string) => {
    const normalizedTag = tag.startsWith('#') ? tag : `#${tag}`
    if (!hashtags.includes(normalizedTag) && hashtags.length < 30) {
      setHashtags([...hashtags, normalizedTag])
    }
    setHashtagInput('')
  }

  const handleRemoveHashtag = (tag: string) => {
    setHashtags(hashtags.filter((h) => h !== tag))
  }

  const handleSubmit = () => {
    if (!selectedAccountId) {
      toast.error('TikTokアカウントを選択してください')
      return
    }

    postToTikTok(
      {
        videoId,
        accountId: selectedAccountId,
        caption,
        hashtags,
        privacyLevel,
      },
      {
        onSuccess: (data) => {
          setPostId(data.postId)
          toast.success('投稿をキューに追加しました')
        },
        onError: (error) => {
          toast.error(error.message || '投稿に失敗しました')
        },
      }
    )
  }

  const isSubmitting = isPosting || !!postId

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">🎵</span>
            TikTokに投稿
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            「{videoTitle}」をTikTokに投稿します
          </DialogDescription>
        </DialogHeader>

        {/* 投稿進捗表示 */}
        {postId && postStatus && (
          <div className="p-4 bg-zinc-800 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {postStatus.status === 'pending' && '投稿準備中...'}
                {postStatus.status === 'processing' && '投稿中...'}
                {postStatus.status === 'completed' && '投稿完了'}
                {postStatus.status === 'failed' && '投稿失敗'}
              </span>
              {postStatus.status === 'completed' && (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              )}
              {postStatus.status === 'failed' && (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              {(postStatus.status === 'pending' || postStatus.status === 'processing') && (
                <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
              )}
            </div>
            <Progress value={postStatus.progress} className="h-2" />
          </div>
        )}

        {!postId && (
          <div className="space-y-4">
            {/* アカウント選択 */}
            <div className="space-y-2">
              <Label>TikTokアカウント</Label>
              {isLoadingAccounts ? (
                <div className="flex items-center gap-2 text-zinc-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  アカウントを読み込み中...
                </div>
              ) : accounts && accounts.length > 0 ? (
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue placeholder="アカウントを選択" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        <div className="flex items-center gap-2">
                          {account.avatar_url && (
                            <img
                              src={account.avatar_url}
                              alt=""
                              className="w-5 h-5 rounded-full"
                            />
                          )}
                          <span>@{account.display_name}</span>
                          {account.follower_count && (
                            <span className="text-zinc-500 text-xs">
                              ({(account.follower_count / 1000).toFixed(1)}K)
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Button
                  variant="outline"
                  className="w-full border-zinc-700 hover:bg-zinc-800"
                  onClick={() => window.location.href = '/api/tiktok/auth'}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  TikTokアカウントを連携
                </Button>
              )}
            </div>

            {/* キャプション */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>キャプション</Label>
                <span className="text-xs text-zinc-500">
                  {caption.length} / 150
                </span>
              </div>
              <Textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value.slice(0, 150))}
                placeholder="キャプションを入力..."
                className="bg-zinc-800 border-zinc-700 resize-none"
                rows={3}
              />
            </div>

            {/* ハッシュタグ */}
            <div className="space-y-2">
              <Label>ハッシュタグ</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {hashtags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm cursor-pointer hover:bg-emerald-500/30"
                    onClick={() => handleRemoveHashtag(tag)}
                  >
                    {tag} ×
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={hashtagInput}
                  onChange={(e) => setHashtagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && hashtagInput.trim()) {
                      e.preventDefault()
                      handleAddHashtag(hashtagInput.trim())
                    }
                  }}
                  placeholder="#タグを入力"
                  className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => hashtagInput.trim() && handleAddHashtag(hashtagInput.trim())}
                  disabled={!hashtagInput.trim()}
                >
                  追加
                </Button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {POPULAR_HASHTAGS.filter((tag) => !hashtags.includes(tag)).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded text-xs hover:bg-zinc-700 hover:text-zinc-300"
                    onClick={() => handleAddHashtag(tag)}
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* 公開設定 */}
            <div className="space-y-2">
              <Label>公開設定</Label>
              <div className="grid grid-cols-3 gap-2">
                {PRIVACY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors ${
                      privacyLevel === option.value
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                        : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600'
                    }`}
                    onClick={() => setPrivacyLevel(option.value)}
                  >
                    <option.icon className="h-5 w-5" />
                    <span className="text-xs">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* フッター */}
        <div className="flex justify-end gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="border-zinc-700"
          >
            キャンセル
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedAccountId}
            className="bg-[#ff0050] hover:bg-[#e6004a]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                投稿中...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                投稿する
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
