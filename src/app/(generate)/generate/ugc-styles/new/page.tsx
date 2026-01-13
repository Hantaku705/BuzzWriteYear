'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Wand2,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { GenerateSidebar } from '@/components/generate/GenerateSidebar'
import { UGCStyleUploader } from '@/components/ugc-style/UGCStyleUploader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useCreateUGCStyle } from '@/hooks/useUGCStyles'

export default function NewUGCStylePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [sampleUrls, setSampleUrls] = useState<string[]>([])

  const { mutate: createStyle, isPending } = useCreateUGCStyle()

  const isValid = name.trim().length > 0 && sampleUrls.length >= 5

  const handleSubmit = () => {
    if (!isValid) return

    createStyle(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        sampleUrls,
      },
      {
        onSuccess: (data) => {
          toast.success('スタイル分析を開始しました')
          router.push(`/generate/ugc-styles/${data.id}`)
        },
        onError: (error) => {
          toast.error(error.message || 'スタイルの作成に失敗しました')
        },
      }
    )
  }

  return (
    <div className="flex h-screen bg-zinc-950">
      {/* Left Sidebar */}
      <GenerateSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center gap-4 px-6 py-4 border-b border-zinc-800">
          <Link
            href="/generate/ugc-styles"
            className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-zinc-400" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-emerald-400" />
              新規スタイル作成
            </h1>
            <p className="text-sm text-zinc-400">
              UGC動画からスタイルを学習します
            </p>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto p-6 space-y-8">
            {/* Info Banner */}
            <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-zinc-300">
                    5本以上のサンプル動画をアップロードまたはURL追加してください。
                    Gemini 2.0がカメラワーク、編集、ビジュアルスタイルを分析し、
                    同じ雰囲気の動画を生成できるようになります。
                  </p>
                </div>
              </div>
            </div>

            {/* Name & Description */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-zinc-300">
                  スタイル名 <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例: エネルギッシュレビュー"
                  className="bg-zinc-900 border-zinc-700"
                  maxLength={255}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-zinc-300">
                  説明（任意）
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="例: TikTok商品レビュー風、手持ちカメラで撮影した雰囲気"
                  className="bg-zinc-900 border-zinc-700 min-h-[80px]"
                  maxLength={500}
                />
              </div>
            </div>

            {/* Video Uploader */}
            <div className="space-y-4">
              <div>
                <Label className="text-zinc-300">
                  サンプル動画 <span className="text-red-400">*</span>
                </Label>
                <p className="text-xs text-zinc-500 mt-1">
                  TikTok URL、動画ファイル、または直接URLを追加できます（最低5本、推奨10本以上）
                </p>
              </div>
              <UGCStyleUploader
                urls={sampleUrls}
                onUrlsChange={setSampleUrls}
                minCount={5}
                maxCount={20}
                disabled={isPending}
              />
            </div>

            {/* Submit */}
            <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
              <p className="text-sm text-zinc-500">
                分析には約{Math.max(1, Math.ceil(sampleUrls.length * 0.5))}〜{Math.ceil(sampleUrls.length * 1)}分かかります
              </p>
              <div className="flex items-center gap-3">
                <Link href="/generate/ugc-styles">
                  <Button variant="outline" className="border-zinc-700">
                    キャンセル
                  </Button>
                </Link>
                <Button
                  onClick={handleSubmit}
                  disabled={!isValid || isPending}
                  className="bg-emerald-500 hover:bg-emerald-600"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      作成中...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-2" />
                      分析開始
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
