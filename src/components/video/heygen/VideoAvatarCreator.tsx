'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Upload, Loader2, Video, CheckCircle, XCircle, AlertCircle, FileVideo } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useCreateVideoAvatar, useVideoAvatarStatus } from '@/hooks/useCustomAvatar'

interface VideoAvatarCreatorProps {
  onSuccess?: (avatarId: string) => void
}

export function VideoAvatarCreator({ onSuccess }: VideoAvatarCreatorProps) {
  const [name, setName] = useState('')
  const [trainingVideoUrl, setTrainingVideoUrl] = useState('')
  const [consentVideoUrl, setConsentVideoUrl] = useState('')
  const [uploadingTraining, setUploadingTraining] = useState(false)
  const [uploadingConsent, setUploadingConsent] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [createdAvatarId, setCreatedAvatarId] = useState<string | null>(null)
  const [trainingId, setTrainingId] = useState<string | null>(null)

  const trainingInputRef = useRef<HTMLInputElement>(null)
  const consentInputRef = useRef<HTMLInputElement>(null)

  const createVideoAvatar = useCreateVideoAvatar()

  // ステータスポーリング
  const { data: avatarStatus } = useVideoAvatarStatus(createdAvatarId, trainingId, {
    enabled: !!createdAvatarId && !!trainingId,
  })

  const uploadVideo = async (file: File, type: 'training' | 'consent'): Promise<string | null> => {
    const supabase = createClient()
    const isTraining = type === 'training'

    isTraining ? setUploadingTraining(true) : setUploadingConsent(true)
    setUploadProgress(0)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('認証が必要です')

      const fileName = `heygen-avatar/${user.id}/${type}-${Date.now()}.mp4`

      // Supabase Storageにアップロード
      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: true,
        })

      if (uploadError) throw uploadError

      setUploadProgress(100)

      // 公開URLを取得
      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(fileName)

      return publicUrl
    } catch (error) {
      console.error('Video upload error:', error)
      toast.error('動画のアップロードに失敗しました')
      return null
    } finally {
      isTraining ? setUploadingTraining(false) : setUploadingConsent(false)
      setUploadProgress(0)
    }
  }

  const handleTrainingUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 動画の長さをチェック（2分以上推奨）
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.src = URL.createObjectURL(file)

    video.onloadedmetadata = async () => {
      URL.revokeObjectURL(video.src)
      const duration = video.duration

      if (duration < 60) {
        toast.warning('トレーニング動画は2分以上推奨です', {
          description: `現在の長さ: ${Math.floor(duration)}秒`,
        })
      }

      const url = await uploadVideo(file, 'training')
      if (url) {
        setTrainingVideoUrl(url)
        toast.success('トレーニング動画をアップロードしました')
      }
    }

    e.target.value = ''
  }

  const handleConsentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const url = await uploadVideo(file, 'consent')
    if (url) {
      setConsentVideoUrl(url)
      toast.success('同意書動画をアップロードしました')
    }
    e.target.value = ''
  }

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('アバター名を入力してください')
      return
    }
    if (!trainingVideoUrl) {
      toast.error('トレーニング動画をアップロードしてください')
      return
    }
    if (!consentVideoUrl) {
      toast.error('同意書動画をアップロードしてください')
      return
    }

    try {
      const result = await createVideoAvatar.mutateAsync({
        trainingVideoUrl,
        consentVideoUrl,
        name: name.trim(),
      })

      setCreatedAvatarId(result.avatar.avatarId)
      setTrainingId(result.avatar.trainingId)
      toast.success(result.message)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'アバター作成に失敗しました')
    }
  }

  // 完了時のコールバック
  if (avatarStatus?.status === 'completed' && createdAvatarId) {
    onSuccess?.(createdAvatarId)
  }

  const isCreating = createVideoAvatar.isPending
  const isTraining = createdAvatarId && (avatarStatus?.status === 'queued' || avatarStatus?.status === 'training')

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Video className="h-5 w-5 text-purple-500" />
          Video Avatar
        </CardTitle>
        <CardDescription>
          動画から高品質なAIアバターを学習（Enterprise限定）
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* トレーニング中の表示 */}
        {isTraining && (
          <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
            <div className="flex items-center gap-3 mb-3">
              <Loader2 className="h-5 w-5 text-purple-500 animate-spin" />
              <span className="text-white font-medium">
                {avatarStatus?.status === 'queued' ? '学習待機中...' : 'アバター学習中...'}
              </span>
            </div>
            {avatarStatus?.progress !== undefined && (
              <Progress value={avatarStatus.progress} className="h-2" />
            )}
            <p className="text-xs text-zinc-400 mt-2">
              {avatarStatus?.estimatedTimeMinutes
                ? `推定残り時間: ${avatarStatus.estimatedTimeMinutes}分`
                : '通常数時間〜1日かかります'}
            </p>
          </div>
        )}

        {/* 完了/失敗表示 */}
        {avatarStatus?.status === 'completed' && (
          <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-white font-medium">アバター学習完了</span>
            </div>
          </div>
        )}

        {avatarStatus?.status === 'failed' && (
          <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5 text-red-500" />
              <span className="text-white font-medium">学習に失敗しました</span>
            </div>
            {avatarStatus.error && (
              <p className="text-xs text-red-400 mt-2">{avatarStatus.error}</p>
            )}
          </div>
        )}

        {/* 入力フォーム（作成前のみ表示） */}
        {!createdAvatarId && (
          <>
            {/* Enterprise警告 */}
            <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                <p className="text-xs text-yellow-400">
                  Video AvatarはHeyGen Enterpriseプランが必要です。
                  契約がない場合はPhoto Avatarをお使いください。
                </p>
              </div>
            </div>

            {/* トレーニング動画 */}
            <div className="space-y-2">
              <Label className="text-white">
                トレーニング動画 <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-4">
                {trainingVideoUrl ? (
                  <div className="relative w-40 h-24 rounded-lg overflow-hidden bg-zinc-800 flex items-center justify-center">
                    <FileVideo className="h-8 w-8 text-purple-500" />
                    <button
                      type="button"
                      onClick={() => setTrainingVideoUrl('')}
                      className="absolute top-1 right-1 p-1 bg-black/50 rounded-full hover:bg-black/70"
                    >
                      <XCircle className="h-4 w-4 text-white" />
                    </button>
                  </div>
                ) : (
                  <label className={`w-40 h-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center transition-all ${uploadingTraining ? 'border-purple-500 bg-purple-500/10 cursor-not-allowed' : 'border-zinc-700 cursor-pointer hover:border-purple-500/50 hover:bg-zinc-800/50'}`}>
                    {uploadingTraining ? (
                      <div className="flex flex-col items-center w-full px-2">
                        <Loader2 className="h-5 w-5 text-purple-500 animate-spin mb-1" />
                        <Progress value={uploadProgress} className="h-1 w-full bg-zinc-700" />
                      </div>
                    ) : (
                      <>
                        <Upload className="h-5 w-5 text-zinc-500 mb-1" />
                        <span className="text-xs text-zinc-500">動画を選択</span>
                      </>
                    )}
                    <input
                      ref={trainingInputRef}
                      type="file"
                      accept="video/*"
                      className="hidden"
                      disabled={uploadingTraining}
                      onChange={handleTrainingUpload}
                    />
                  </label>
                )}
                <div className="flex-1 space-y-1">
                  <p className="text-sm text-zinc-400">要件:</p>
                  <ul className="text-xs text-zinc-500 space-y-0.5">
                    <li>• 2分以上の動画（5分以上推奨）</li>
                    <li>• 正面から撮影、顔が常に見える</li>
                    <li>• 静かな環境、クリアな音声</li>
                    <li>• 多様な表情・動きを含める</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 同意書動画 */}
            <div className="space-y-2">
              <Label className="text-white">
                同意書動画 <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-4">
                {consentVideoUrl ? (
                  <div className="relative w-40 h-24 rounded-lg overflow-hidden bg-zinc-800 flex items-center justify-center">
                    <FileVideo className="h-8 w-8 text-purple-500" />
                    <button
                      type="button"
                      onClick={() => setConsentVideoUrl('')}
                      className="absolute top-1 right-1 p-1 bg-black/50 rounded-full hover:bg-black/70"
                    >
                      <XCircle className="h-4 w-4 text-white" />
                    </button>
                  </div>
                ) : (
                  <label className={`w-40 h-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center transition-all ${uploadingConsent ? 'border-purple-500 bg-purple-500/10 cursor-not-allowed' : 'border-zinc-700 cursor-pointer hover:border-purple-500/50 hover:bg-zinc-800/50'}`}>
                    {uploadingConsent ? (
                      <div className="flex flex-col items-center w-full px-2">
                        <Loader2 className="h-5 w-5 text-purple-500 animate-spin mb-1" />
                        <Progress value={uploadProgress} className="h-1 w-full bg-zinc-700" />
                      </div>
                    ) : (
                      <>
                        <Upload className="h-5 w-5 text-zinc-500 mb-1" />
                        <span className="text-xs text-zinc-500">動画を選択</span>
                      </>
                    )}
                    <input
                      ref={consentInputRef}
                      type="file"
                      accept="video/*"
                      className="hidden"
                      disabled={uploadingConsent}
                      onChange={handleConsentUpload}
                    />
                  </label>
                )}
                <div className="flex-1 space-y-1">
                  <p className="text-sm text-zinc-400">同意書動画の内容:</p>
                  <p className="text-xs text-zinc-500">
                    「私は[名前]です。HeyGenでこの肖像を使用したAIアバターの作成を許可します。」
                    と本人が述べている動画
                  </p>
                </div>
              </div>
            </div>

            {/* アバター名 */}
            <div className="space-y-2">
              <Label htmlFor="video-avatar-name" className="text-white">
                アバター名 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="video-avatar-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: プレゼンター山田"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            {/* 作成ボタン */}
            <Button
              onClick={handleCreate}
              disabled={isCreating || !name.trim() || !trainingVideoUrl || !consentVideoUrl}
              className="w-full bg-purple-500 hover:bg-purple-600"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  学習開始中...
                </>
              ) : (
                'Video Avatar 学習を開始'
              )}
            </Button>

            <p className="text-xs text-zinc-500 text-center">
              ※ Enterprise プランが必要です。学習には数時間〜1日かかる場合があります。
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
