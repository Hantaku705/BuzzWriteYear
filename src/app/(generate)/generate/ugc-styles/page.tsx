'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Plus,
  Upload,
  Search,
  Loader2,
  Wand2,
} from 'lucide-react'
import { GenerateSidebar } from '@/components/generate/GenerateSidebar'
import { UGCStyleCard } from '@/components/ugc-style/UGCStyleCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  useUGCStyles,
  useDeleteUGCStyle,
  useExportUGCStyle,
  useImportUGCStyle,
  downloadJSON,
  readJSONFile,
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

export default function UGCStylesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: styles, isLoading, error } = useUGCStyles()
  const { mutate: deleteStyle, isPending: isDeleting } = useDeleteUGCStyle()
  const { mutate: exportStyle, isPending: isExporting } = useExportUGCStyle()
  const { mutate: importStyle, isPending: isImporting } = useImportUGCStyle()

  // Filter styles by search query
  const filteredStyles = styles?.filter((style) =>
    style.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    style.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    style.keywords?.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // Handle export
  const handleExport = useCallback((id: string) => {
    const style = styles?.find((s) => s.id === id)
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
  }, [styles, exportStyle])

  // Handle delete
  const handleDelete = useCallback(() => {
    if (!deleteId) return

    deleteStyle(deleteId, {
      onSuccess: () => {
        toast.success('スタイルを削除しました')
        setDeleteId(null)
      },
      onError: (error) => {
        toast.error(error.message || '削除に失敗しました')
      },
    })
  }, [deleteId, deleteStyle])

  // Handle import
  const handleImport = useCallback(async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        const data = await readJSONFile(file)
        importStyle(data, {
          onSuccess: (result) => {
            toast.success(result.message || `「${result.name}」をインポートしました`)
          },
          onError: (error) => {
            toast.error(error.message || 'インポートに失敗しました')
          },
        })
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'ファイルの読み込みに失敗しました')
      }
    }
    input.click()
  }, [importStyle])

  return (
    <div className="flex h-screen bg-zinc-950">
      {/* Left Sidebar */}
      <GenerateSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Wand2 className="w-6 h-6 text-emerald-400" />
              UGCスタイル
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              動画からスタイルを学習し、同じ雰囲気の動画を生成
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleImport}
              variant="outline"
              disabled={isImporting}
              className="border-zinc-700"
            >
              {isImporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              インポート
            </Button>
            <Link href="/generate/ugc-styles/new">
              <Button className="bg-emerald-500 hover:bg-emerald-600">
                <Plus className="w-4 h-4 mr-2" />
                新規作成
              </Button>
            </Link>
          </div>
        </header>

        {/* Search */}
        <div className="px-6 py-4 border-b border-zinc-800">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="スタイルを検索..."
              className="pl-10 bg-zinc-900 border-zinc-700"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64">
              <p className="text-red-400 mb-2">スタイルの取得に失敗しました</p>
              <p className="text-sm text-zinc-500">{error.message}</p>
            </div>
          ) : filteredStyles && filteredStyles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredStyles.map((style) => (
                <UGCStyleCard
                  key={style.id}
                  style={style}
                  onExport={handleExport}
                  onDelete={(id) => setDeleteId(id)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
                <Wand2 className="w-10 h-10 text-zinc-600" />
              </div>
              <p className="text-lg font-medium text-white mb-2">
                {searchQuery ? 'スタイルが見つかりません' : 'スタイルがありません'}
              </p>
              <p className="text-sm text-zinc-500 mb-4 text-center">
                {searchQuery
                  ? '検索条件を変更してください'
                  : 'UGC動画からスタイルを学習して、同じ雰囲気の動画を生成できます'}
              </p>
              {!searchQuery && (
                <Link href="/generate/ugc-styles/new">
                  <Button className="bg-emerald-500 hover:bg-emerald-600">
                    <Plus className="w-4 h-4 mr-2" />
                    最初のスタイルを作成
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>スタイルを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。スタイルとすべてのサンプル動画が削除されます。
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
