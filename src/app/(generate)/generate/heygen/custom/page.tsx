'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, User, Video, Loader2, CheckCircle, XCircle, Clock, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { PhotoAvatarCreator } from '@/components/video/heygen/PhotoAvatarCreator'
import { VideoAvatarCreator } from '@/components/video/heygen/VideoAvatarCreator'
import { useCustomAvatars } from '@/hooks/useCustomAvatar'

export default function CustomAvatarPage() {
  const [activeTab, setActiveTab] = useState<'photo' | 'video'>('photo')
  const { data: avatars, isLoading: loadingAvatars, refetch } = useCustomAvatars()

  const handleAvatarCreated = (avatarId: string) => {
    toast.success('アバターが作成されました', {
      description: `アバターID: ${avatarId}`,
    })
    refetch()
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="flex items-center gap-1 text-xs text-green-500">
            <CheckCircle className="h-3 w-3" />
            完了
          </span>
        )
      case 'processing':
      case 'training':
      case 'queued':
        return (
          <span className="flex items-center gap-1 text-xs text-yellow-500">
            <Clock className="h-3 w-3" />
            処理中
          </span>
        )
      case 'failed':
        return (
          <span className="flex items-center gap-1 text-xs text-red-500">
            <XCircle className="h-3 w-3" />
            失敗
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/generate">
            <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-white">カスタムアバター作成</h1>
            <p className="text-sm text-zinc-400">自分だけのAIアバターを作成</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左側: 作成フォーム */}
          <div>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'photo' | 'video')}>
              <TabsList className="grid w-full grid-cols-2 bg-zinc-800">
                <TabsTrigger value="photo" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Photo Avatar
                </TabsTrigger>
                <TabsTrigger value="video" className="flex items-center gap-2">
                  <Video className="h-4 w-4" />
                  Video Avatar
                </TabsTrigger>
              </TabsList>

              <div className="mt-6">
                <TabsContent value="photo">
                  <PhotoAvatarCreator onSuccess={handleAvatarCreated} />
                </TabsContent>
                <TabsContent value="video">
                  <VideoAvatarCreator onSuccess={handleAvatarCreated} />
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* 右側: アバター一覧 */}
          <div>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">作成したアバター</CardTitle>
                <CardDescription>作成済みのカスタムアバター一覧</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingAvatars ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 text-pink-500 animate-spin" />
                  </div>
                ) : avatars && avatars.length > 0 ? (
                  <div className="space-y-3">
                    {avatars.map((avatar) => (
                      <div
                        key={avatar.avatarId}
                        className="flex items-center gap-4 p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
                      >
                        {/* プレビュー画像 */}
                        <div className="w-12 h-12 rounded-lg bg-zinc-700 overflow-hidden flex-shrink-0">
                          {avatar.previewImageUrl ? (
                            <img
                              src={avatar.previewImageUrl}
                              alt={avatar.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              {avatar.type === 'photo' ? (
                                <User className="h-5 w-5 text-zinc-500" />
                              ) : (
                                <Video className="h-5 w-5 text-zinc-500" />
                              )}
                            </div>
                          )}
                        </div>

                        {/* 情報 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white truncate">
                              {avatar.name}
                            </span>
                            <span className={`px-2 py-0.5 text-xs rounded ${avatar.type === 'photo' ? 'bg-pink-500/20 text-pink-400' : 'bg-purple-500/20 text-purple-400'}`}>
                              {avatar.type === 'photo' ? 'Photo' : 'Video'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {getStatusBadge(avatar.status)}
                            <span className="text-xs text-zinc-500">
                              {new Date(avatar.createdAt).toLocaleDateString('ja-JP')}
                            </span>
                          </div>
                        </div>

                        {/* アクション */}
                        {avatar.status === 'completed' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-zinc-400 hover:text-white"
                            onClick={() => {
                              navigator.clipboard.writeText(avatar.avatarId)
                              toast.success('アバターIDをコピーしました')
                            }}
                          >
                            ID コピー
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <User className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
                    <p className="text-zinc-400">まだアバターがありません</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      左のフォームからアバターを作成してください
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 使い方ガイド */}
            <Card className="bg-zinc-900 border-zinc-800 mt-6">
              <CardHeader>
                <CardTitle className="text-white text-base">使い方</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-pink-400 mb-2">Photo Avatar</h4>
                  <ol className="text-xs text-zinc-400 space-y-1">
                    <li>1. 顔写真をアップロード（正面向き推奨）</li>
                    <li>2. アバター名と性別を設定</li>
                    <li>3. 「作成」をクリック（数分で完了）</li>
                    <li>4. 動画生成時にアバターを選択</li>
                  </ol>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-purple-400 mb-2">Video Avatar</h4>
                  <ol className="text-xs text-zinc-400 space-y-1">
                    <li>1. トレーニング動画をアップロード（2分以上）</li>
                    <li>2. 同意書動画をアップロード</li>
                    <li>3. アバター名を設定</li>
                    <li>4. 「学習開始」をクリック（数時間〜1日）</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
