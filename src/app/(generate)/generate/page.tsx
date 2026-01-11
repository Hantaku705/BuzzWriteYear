'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Sparkles,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Download,
  Heart,
  Share2,
  MoreHorizontal,
  Grid3X3,
  List,
  Clock,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GenerateSidebar } from '@/components/generate/GenerateSidebar'
import { GenerateInputPanel } from '@/components/generate/GenerateInputPanel'
import { GeneratePreviewPanel } from '@/components/generate/GeneratePreviewPanel'

export default function GeneratePage() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true)
    // TODO: Connect to Kling API
    setTimeout(() => {
      setIsGenerating(false)
      setGeneratedVideo('https://example.com/video.mp4')
    }, 3000)
  }, [])

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
          onGenerate={handleGenerate}
        />

        {/* Right Panel - Preview & History */}
        <GeneratePreviewPanel
          generatedVideo={generatedVideo}
          isGenerating={isGenerating}
        />
      </div>
    </div>
  )
}
