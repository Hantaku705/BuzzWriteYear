'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { GenerateSidebar } from '@/components/generate/GenerateSidebar'
import { GenerateInputPanel } from '@/components/generate/GenerateInputPanel'
import { GeneratePreviewPanel } from '@/components/generate/GeneratePreviewPanel'
import { useKlingGenerate } from '@/hooks/useKlingGenerate'
import { useVideoStatus } from '@/hooks/useVideoStatus'
import type { KlingModelVersion, KlingAspectRatio, KlingQuality } from '@/types/database'

export default function GeneratePage() {
  const router = useRouter()
  const [prompt, setPrompt] = useState('')
  const [generatedVideoId, setGeneratedVideoId] = useState<string | null>(null)
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null)

  const { mutate: generateVideo, isPending: isGenerating } = useKlingGenerate()

  // Poll for video status when we have a video ID
  const { data: videoStatus } = useVideoStatus(generatedVideoId, {
    enabled: !!generatedVideoId,
    pollInterval: 3000,
  })

  // Update video URL when status changes to completed
  useEffect(() => {
    if (videoStatus?.status === 'completed' && videoStatus.remoteUrl && !generatedVideoUrl) {
      setGeneratedVideoUrl(videoStatus.remoteUrl)
      toast.success('動画生成が完了しました')
    }
  }, [videoStatus?.status, videoStatus?.remoteUrl, generatedVideoUrl])

  const handleGenerate = useCallback(async (params: {
    mode: 'image-to-video' | 'text-to-video'
    imageUrl?: string
    imageTailUrl?: string
    prompt: string
    modelVersion: KlingModelVersion
    aspectRatio: KlingAspectRatio
    quality: KlingQuality
    duration: 5 | 10
    enableAudio?: boolean
  }) => {
    generateVideo(
      {
        mode: params.mode,
        imageUrl: params.imageUrl,
        imageTailUrl: params.imageTailUrl,
        prompt: params.prompt || 'AI generated video',
        title: params.prompt?.slice(0, 50) || 'AI動画',
        modelVersion: params.modelVersion,
        aspectRatio: params.aspectRatio,
        quality: params.quality,
        duration: params.duration,
        enableAudio: params.enableAudio,
      },
      {
        onSuccess: (data) => {
          setGeneratedVideoId(data.video.id)
          toast.success('動画生成を開始しました')
        },
        onError: (error) => {
          toast.error(error.message || '動画生成に失敗しました')
        },
      }
    )
  }, [generateVideo])

  return (
    <div className="flex h-screen bg-zinc-950">
      {/* Left Sidebar - Navigation */}
      <GenerateSidebar />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Input */}
        <GenerateInputPanel
          prompt={prompt}
          setPrompt={setPrompt}
          isGenerating={isGenerating}
          generationProgress={videoStatus?.progress}
          onGenerate={handleGenerate}
        />

        {/* Right Panel - Preview & History */}
        <GeneratePreviewPanel
          generatedVideoId={generatedVideoId}
          generatedVideoUrl={generatedVideoUrl}
          isGenerating={isGenerating}
          generationProgress={videoStatus?.progress}
          generationStatus={videoStatus?.status}
        />
      </div>
    </div>
  )
}
