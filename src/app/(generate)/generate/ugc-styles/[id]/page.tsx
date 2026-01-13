'use client'

import { useState, useCallback, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Wand2,
  Download,
  Trash2,
  Edit,
  Save,
  X,
  Loader2,
} from 'lucide-react'
import { GenerateSidebar } from '@/components/generate/GenerateSidebar'
import { UGCStyleProgress } from '@/components/ugc-style/UGCStyleProgress'
import { UGCStyleProfile } from '@/components/ugc-style/UGCStyleProfile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  useUGCStyleWithPolling,
  useUpdateUGCStyle,
  useDeleteUGCStyle,
  useExportUGCStyle,
  downloadJSON,
} from '@/hooks/useUGCStyles'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { StyleProfile, GenerationParams, UGCStyleSample } from '@/types/ugc-style'

export default function UGCStyleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const { data: style, isLoading, error } = useUGCStyleWithPolling(id)
  const { mutate: updateStyle, isPending: isUpdating } = useUpdateUGCStyle()
  const { mutate: deleteStyle, isPending: isDeleting } = useDeleteUGCStyle()
  const { mutate: exportStyle, isPending: isExporting } = useExportUGCStyle()

  // Start editing
  const handleStartEdit = useCallback(() => {
    if (style) {
      setEditName(style.name)
      setEditDescription(style.description || '')
      setIsEditing(true)
    }
  }, [style])

  // Save edit
  const handleSaveEdit = useCallback(() => {
    if (!editName.trim()) {
      toast.error('名前は必須です')
      return
    }

    updateStyle(
      {
        id,
        data: {
          name: editName.trim(),
          description: editDescription.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success('スタイルを更新しました')
          setIsEditing(false)
        },
        onError: (error) => {
          toast.error(error.message || '更新に失敗しました')
        },
      }
    )
  }, [id, editName, editDescription, updateStyle])

  // Export
  const handleExport = useCallback(() => {
    if (!style) return

    exportStyle(id, {
      onSuccess: (data) => {
        downloadJSON(data, `ugc-style-${style.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`)
        toast.success('スタイルをエクスポートしました')
      },
      onError: (error) => {
        toast.error(error.message || 'エクスポートに失敗しました')
      },
    })
  }, [id, style, exportStyle])

  // Delete
  const handleDelete = useCallback(() => {
    deleteStyle(id, {
      onSuccess: () => {
        toast.success('スタイルを削除しました')
        router.push('/generate/ugc-styles')
      },
      onError: (error) => {
        toast.error(error.message || '削除に失敗しました')
      },
    })
  }, [id, deleteStyle, router])

  if (isLoading) {
    return (
      <div className="flex h-screen bg-zinc-950">
        <GenerateSidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        </div>
      </div>
    )
  }

  if (error || !style) {
    return (
      <div className="flex h-screen bg-zinc-950">
        <GenerateSidebar />
        <div className="flex-1 flex flex-col items-center justify-center">
          <p className="text-red-400 mb-2">スタイルが見つかりません</p>
          <Link href="/generate/ugc-styles">
            <Button variant="outline" className="border-zinc-700">
              一覧に戻る
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-zinc-950">
      {/* Left Sidebar */}
      <GenerateSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-4">
            <Link
              href="/generate/ugc-styles"
              className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-zinc-400" />
            </Link>
            {isEditing ? (
              <div className="space-y-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="bg-zinc-900 border-zinc-700 text-lg font-bold"
                  placeholder="スタイル名"
                  maxLength={255}
                />
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="bg-zinc-900 border-zinc-700 text-sm min-h-[60px]"
                  placeholder="説明（任意）"
                  maxLength={500}
                />
              </div>
            ) : (
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-emerald-400" />
                  {style.name}
                </h1>
                {style.description && (
                  <p className="text-sm text-zinc-400 mt-1">{style.description}</p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button
                  onClick={() => setIsEditing(false)}
                  variant="outline"
                  className="border-zinc-700"
                >
                  <X className="w-4 h-4 mr-1" />
                  キャンセル
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={isUpdating}
                  className="bg-emerald-500 hover:bg-emerald-600"
                >
                  {isUpdating ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-1" />
                  )}
                  保存
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handleStartEdit}
                  variant="outline"
                  className="border-zinc-700"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  編集
                </Button>
                {style.status === 'ready' && (
                  <Button
                    onClick={handleExport}
                    variant="outline"
                    className="border-zinc-700"
                    disabled={isExporting}
                  >
                    {isExporting ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-1" />
                    )}
                    エクスポート
                  </Button>
                )}
                <Button
                  onClick={() => setShowDeleteDialog(true)}
                  variant="outline"
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  削除
                </Button>
              </>
            )}
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Status / Progress */}
            {style.status === 'analyzing' && (
              <UGCStyleProgress
                status={style.status}
                progress={style.progress || 0}
                samples={style.samples as UGCStyleSample[] | undefined}
                estimatedTime={(style.sample_count - (style.progress || 0) / 100 * style.sample_count) * 30}
              />
            )}

            {style.status === 'failed' && (
              <UGCStyleProgress
                status={style.status}
                progress={0}
                errorMessage={style.error_message ?? undefined}
              />
            )}

            {/* Profile */}
            {style.status === 'ready' && style.style_profile && (
              <UGCStyleProfile
                styleProfile={style.style_profile as StyleProfile}
                generationParams={style.generation_params as GenerationParams | undefined}
                keywords={style.keywords}
                overallVibe={style.overall_vibe ?? undefined}
              />
            )}

            {/* Sample Videos */}
            {style.samples && style.samples.length > 0 && style.status === 'ready' && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">サンプル動画</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {(style.samples as UGCStyleSample[]).map((sample) => (
                    <div
                      key={sample.id}
                      className="aspect-video bg-zinc-800 rounded-lg overflow-hidden relative group"
                    >
                      <video
                        src={sample.video_url}
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
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-xs text-white truncate">
                          {sample.filename || 'サンプル動画'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Use Style CTA */}
            {style.status === 'ready' && (
              <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-xl p-6 text-center">
                <h3 className="text-lg font-semibold text-white mb-2">
                  このスタイルで動画を生成
                </h3>
                <p className="text-sm text-zinc-400 mb-4">
                  Kling AIで商品画像やテキストから、このスタイルの動画を生成できます
                </p>
                <Link href="/generate">
                  <Button className="bg-emerald-500 hover:bg-emerald-600">
                    <Wand2 className="w-4 h-4 mr-2" />
                    動画を生成
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>スタイルを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。スタイル「{style.name}」とすべてのサンプル動画が削除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
