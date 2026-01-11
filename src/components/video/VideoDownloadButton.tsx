'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Download, Loader2, Terminal, Copy, Check } from 'lucide-react'

interface VideoDownloadButtonProps {
  videoId: string
  videoUrl?: string | null
  compositionId?: string
  inputProps?: Record<string, unknown> | null
  className?: string
}

export function VideoDownloadButton({
  videoId,
  videoUrl,
  compositionId,
  inputProps,
  className,
}: VideoDownloadButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleDownload = () => {
    if (videoUrl) {
      // video_url がある場合は直接ダウンロード
      const link = document.createElement('a')
      link.href = videoUrl
      link.download = `video-${videoId}.mp4`
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } else if (compositionId && inputProps) {
      // Remotion動画でvideo_urlがない場合はガイドダイアログを表示
      setIsDialogOpen(true)
    }
  }

  const renderCommand = compositionId && inputProps
    ? `npm run remotion:render -- ${compositionId} --props='${JSON.stringify(inputProps)}' --output=out/${videoId}.mp4`
    : ''

  const copyCommand = async () => {
    await navigator.clipboard.writeText(renderCommand)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <Button
        variant="outline"
        className={className}
        onClick={handleDownload}
      >
        <Download className="mr-2 h-4 w-4" />
        ダウンロード
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">動画を書き出す</DialogTitle>
            <DialogDescription className="text-zinc-400">
              この動画はまだレンダリングされていません。以下の方法で書き出しできます。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Option 1: Remotion Studio */}
            <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
              <h4 className="font-medium text-white mb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-pink-500 flex items-center justify-center text-xs">1</span>
                Remotion Studio で書き出し
              </h4>
              <p className="text-sm text-zinc-400 mb-3">
                GUIで簡単に動画を書き出せます。開発サーバーが起動している必要があります。
              </p>
              <div className="flex gap-2">
                <code className="flex-1 p-2 rounded bg-zinc-900 text-zinc-300 text-sm font-mono">
                  npm run remotion:studio
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-zinc-700"
                  onClick={() => window.open('http://localhost:3000', '_blank')}
                >
                  <Terminal className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Option 2: CLI */}
            <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
              <h4 className="font-medium text-white mb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-pink-500 flex items-center justify-center text-xs">2</span>
                コマンドラインで書き出し
              </h4>
              <p className="text-sm text-zinc-400 mb-3">
                以下のコマンドをターミナルで実行してください。
              </p>
              <div className="flex gap-2">
                <code className="flex-1 p-2 rounded bg-zinc-900 text-zinc-300 text-xs font-mono overflow-x-auto">
                  {renderCommand}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-zinc-700 flex-shrink-0"
                  onClick={copyCommand}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Note about Redis */}
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <p className="text-sm text-yellow-200">
                💡 <strong>ヒント:</strong> Redis (Upstash) を設定すると、自動でサーバーサイドレンダリングが有効になり、
                動画が自動的に生成・保存されます。
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
