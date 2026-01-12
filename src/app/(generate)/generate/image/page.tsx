'use client'

import { useRouter } from 'next/navigation'
import { ImageIcon, ArrowLeft, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GenerateSidebar } from '@/components/generate/GenerateSidebar'

export default function ImageGeneratePage() {
  const router = useRouter()

  return (
    <div className="flex h-screen bg-zinc-950">
      <GenerateSidebar />

      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto bg-zinc-800 rounded-2xl flex items-center justify-center mb-6">
            <ImageIcon className="h-10 w-10 text-zinc-600" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">
            画像生成機能は開発中です
          </h1>
          <p className="text-zinc-400 mb-6">
            現在は動画生成機能をご利用ください。
            <br />
            Kling AIで高品質な動画を生成できます。
          </p>
          <Button
            onClick={() => router.push('/generate')}
            className="bg-pink-500 hover:bg-pink-600"
          >
            <Video className="mr-2 h-4 w-4" />
            動画生成へ
          </Button>
        </div>
      </div>
    </div>
  )
}
