'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Upload, Loader2, User, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useOptimizedUpload } from '@/hooks/useOptimizedUpload'
import { useCreatePhotoAvatar, usePhotoAvatarStatus } from '@/hooks/useCustomAvatar'

interface PhotoAvatarCreatorProps {
  onSuccess?: (avatarId: string) => void
}

export function PhotoAvatarCreator({ onSuccess }: PhotoAvatarCreatorProps) {
  const [name, setName] = useState('')
  const [gender, setGender] = useState<'male' | 'female'>('female')
  const [imageUrl, setImageUrl] = useState('')
  const [createdAvatarId, setCreatedAvatarId] = useState<string | null>(null)

  const { upload, isUploading: uploading, progress: uploadProgress } = useOptimizedUpload({
    format: 'jpeg',
    quality: 90,
  })

  const createPhotoAvatar = useCreatePhotoAvatar()

  // ステータスポーリング
  const { data: avatarStatus } = usePhotoAvatarStatus(createdAvatarId, {
    enabled: !!createdAvatarId,
  })

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const result = await upload(file)
    if (result?.image?.url) {
      setImageUrl(result.image.url)
      toast.success('画像をアップロードしました')
    } else {
      toast.error('画像のアップロードに失敗しました')
    }
    e.target.value = ''
  }

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('アバター名を入力してください')
      return
    }
    if (!imageUrl) {
      toast.error('画像をアップロードしてください')
      return
    }

    try {
      const result = await createPhotoAvatar.mutateAsync({
        imageUrl,
        name: name.trim(),
        gender,
      })

      setCreatedAvatarId(result.avatar.avatarId)
      toast.success(result.message)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'アバター作成に失敗しました')
    }
  }

  // 完了時のコールバック
  if (avatarStatus?.status === 'completed' && createdAvatarId) {
    onSuccess?.(createdAvatarId)
  }

  const isCreating = createPhotoAvatar.isPending
  const isProcessing = createdAvatarId && avatarStatus?.status === 'processing'

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <User className="h-5 w-5 text-pink-500" />
          Photo Avatar
        </CardTitle>
        <CardDescription>
          写真1枚からAIアバターを作成します（数分で完了）
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* トレーニング中の表示 */}
        {isProcessing && (
          <div className="p-4 bg-pink-500/10 rounded-lg border border-pink-500/20">
            <div className="flex items-center gap-3 mb-3">
              <Loader2 className="h-5 w-5 text-pink-500 animate-spin" />
              <span className="text-white font-medium">アバター作成中...</span>
            </div>
            <Progress value={50} className="h-2" />
            <p className="text-xs text-zinc-400 mt-2">
              通常2-5分で完了します
            </p>
          </div>
        )}

        {/* 完了/失敗表示 */}
        {avatarStatus?.status === 'completed' && (
          <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-white font-medium">アバター作成完了</span>
            </div>
            {avatarStatus.previewUrl && (
              <img
                src={avatarStatus.previewUrl}
                alt="Avatar preview"
                className="mt-3 w-24 h-24 rounded-lg object-cover"
              />
            )}
          </div>
        )}

        {avatarStatus?.status === 'failed' && (
          <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5 text-red-500" />
              <span className="text-white font-medium">作成に失敗しました</span>
            </div>
            {avatarStatus.error && (
              <p className="text-xs text-red-400 mt-2">{avatarStatus.error}</p>
            )}
          </div>
        )}

        {/* 入力フォーム（作成前のみ表示） */}
        {!createdAvatarId && (
          <>
            {/* 画像アップロード */}
            <div className="space-y-2">
              <Label className="text-white">顔写真</Label>
              <div className="flex gap-4">
                {imageUrl ? (
                  <div className="relative w-32 h-32 rounded-lg overflow-hidden bg-zinc-800">
                    <img
                      src={imageUrl}
                      alt="Avatar source"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="absolute top-1 right-1 p-1 bg-black/50 rounded-full hover:bg-black/70"
                    >
                      <XCircle className="h-4 w-4 text-white" />
                    </button>
                  </div>
                ) : (
                  <label className={`w-32 h-32 rounded-lg border-2 border-dashed flex flex-col items-center justify-center transition-all ${uploading ? 'border-pink-500 bg-pink-500/10 cursor-not-allowed' : 'border-zinc-700 cursor-pointer hover:border-pink-500/50 hover:bg-zinc-800/50'}`}>
                    {uploading ? (
                      <div className="flex flex-col items-center w-full px-2">
                        <Loader2 className="h-6 w-6 text-pink-500 animate-spin mb-2" />
                        <Progress value={uploadProgress} className="h-1.5 w-full bg-zinc-700" />
                      </div>
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-zinc-500 mb-2" />
                        <span className="text-xs text-zinc-500 text-center">
                          アップロード
                        </span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploading}
                      onChange={handleImageUpload}
                    />
                  </label>
                )}
                <div className="flex-1 space-y-2">
                  <p className="text-sm text-zinc-400">推奨条件:</p>
                  <ul className="text-xs text-zinc-500 space-y-1">
                    <li>• 顔が正面を向いている写真</li>
                    <li>• 解像度 512x512px 以上</li>
                    <li>• 背景がシンプルなもの</li>
                    <li>• サングラス・マスクなし</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* アバター名 */}
            <div className="space-y-2">
              <Label htmlFor="avatar-name" className="text-white">
                アバター名 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="avatar-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: 田中さんアバター"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            {/* 性別 */}
            <div className="space-y-2">
              <Label className="text-white">性別</Label>
              <Select value={gender} onValueChange={(v) => setGender(v as 'male' | 'female')}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="female">女性</SelectItem>
                  <SelectItem value="male">男性</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 作成ボタン */}
            <Button
              onClick={handleCreate}
              disabled={isCreating || !name.trim() || !imageUrl}
              className="w-full bg-pink-500 hover:bg-pink-600"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  作成開始中...
                </>
              ) : (
                'Photo Avatar を作成'
              )}
            </Button>

            <p className="text-xs text-zinc-500 text-center">
              ※ Business プラン以上が必要です
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
