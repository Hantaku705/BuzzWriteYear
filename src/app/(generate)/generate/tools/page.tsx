'use client'

import { useRouter } from 'next/navigation'
import {
  Grid3X3,
  Video,
  ImageIcon,
  User,
  Wand2,
  Layers,
  Layout,
  FolderOpen,
  Sparkles,
  Film,
  Music,
  Palette,
  Scissors,
  RefreshCw,
  Maximize,
  Type,
  Move,
  Zap,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { GenerateSidebar } from '@/components/generate/GenerateSidebar'

type ToolCategory = {
  name: string
  description: string
  tools: Tool[]
}

type Tool = {
  id: string
  name: string
  description: string
  icon: typeof Video
  href: string
  badge?: string
  status: 'available' | 'coming-soon' | 'beta'
}

const categories: ToolCategory[] = [
  {
    name: '動画生成',
    description: 'AIで動画を自動生成',
    tools: [
      {
        id: 'kling',
        name: 'Kling AI動画生成',
        description: 'テキストや画像から高品質な動画を生成',
        icon: Video,
        href: '/generate',
        status: 'available',
      },
      {
        id: 'heygen',
        name: 'HeyGen アバター',
        description: 'AIアバターが話す動画を生成',
        icon: User,
        href: '/generate/heygen',
        badge: 'NEW',
        status: 'available',
      },
      {
        id: 'text-to-video',
        name: 'テキストから動画',
        description: 'プロンプトのみで動画を生成',
        icon: Type,
        href: '/generate',
        status: 'available',
      },
      {
        id: 'image-to-video',
        name: '画像から動画',
        description: '静止画に動きを追加',
        icon: Film,
        href: '/generate',
        status: 'available',
      },
    ],
  },
  {
    name: '動画編集',
    description: 'AI支援の動画編集ツール',
    tools: [
      {
        id: 'extend',
        name: '動画延長',
        description: '5秒の動画を10秒に延長',
        icon: Maximize,
        href: '/generate',
        status: 'available',
      },
      {
        id: 'lip-sync',
        name: 'リップシンク',
        description: '動画に音声を同期',
        icon: Music,
        href: '/generate',
        status: 'available',
      },
      {
        id: 'background',
        name: '背景変更',
        description: '動画の背景を置き換え',
        icon: Layers,
        href: '/generate',
        status: 'available',
      },
      {
        id: 'inpaint',
        name: 'オブジェクト削除',
        description: '不要な物を自然に消去',
        icon: Scissors,
        href: '/generate',
        status: 'available',
      },
    ],
  },
  {
    name: 'エフェクト',
    description: '動画にエフェクトを追加',
    tools: [
      {
        id: 'motion',
        name: 'モーション参照',
        description: '参照動画の動きを適用',
        icon: Move,
        href: '/generate',
        status: 'available',
      },
      {
        id: 'camera',
        name: 'カメラ制御',
        description: 'カメラワークを制御',
        icon: Film,
        href: '/generate',
        status: 'available',
      },
      {
        id: 'ugc',
        name: 'UGC風加工',
        description: '自然なSNS投稿風に',
        icon: Sparkles,
        href: '/generate',
        status: 'available',
      },
    ],
  },
  {
    name: '管理',
    description: 'アセットと履歴の管理',
    tools: [
      {
        id: 'assets',
        name: 'アセット管理',
        description: '生成した動画・画像を管理',
        icon: FolderOpen,
        href: '/generate/assets',
        status: 'available',
      },
      {
        id: 'variants',
        name: 'バリアント生成',
        description: 'A/Bテスト用に複数パターン',
        icon: RefreshCw,
        href: '/videos',
        status: 'available',
      },
    ],
  },
]

export default function ToolsPage() {
  const router = useRouter()

  return (
    <div className="flex h-screen bg-zinc-950">
      <GenerateSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Grid3X3 className="h-6 w-6 text-emerald-400" />
              すべてのツール
            </h1>
          </div>
          <p className="text-zinc-400 mt-1">
            動画・画像生成に使用できるすべてのAIツール
          </p>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto space-y-10">
            {categories.map((category) => (
              <div key={category.name}>
                <div className="mb-4">
                  <h2 className="text-lg font-bold text-white">{category.name}</h2>
                  <p className="text-sm text-zinc-500">{category.description}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {category.tools.map((tool) => (
                    <button
                      key={tool.id}
                      onClick={() => router.push(tool.href)}
                      disabled={tool.status === 'coming-soon'}
                      className={cn(
                        'group relative flex items-start gap-4 p-4 rounded-xl border text-left transition-all',
                        tool.status === 'coming-soon'
                          ? 'border-zinc-800 bg-zinc-900/50 opacity-60 cursor-not-allowed'
                          : 'border-zinc-800 bg-zinc-900 hover:border-emerald-500/50 hover:bg-zinc-800/50'
                      )}
                    >
                      {/* Icon */}
                      <div
                        className={cn(
                          'flex items-center justify-center w-12 h-12 rounded-xl transition-colors',
                          tool.status === 'coming-soon'
                            ? 'bg-zinc-800 text-zinc-600'
                            : 'bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20'
                        )}
                      >
                        <tool.icon className="h-6 w-6" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-white">{tool.name}</h3>
                          {tool.badge && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-500 text-white rounded">
                              {tool.badge}
                            </span>
                          )}
                          {tool.status === 'coming-soon' && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-yellow-500 text-black rounded">
                              準備中
                            </span>
                          )}
                          {tool.status === 'beta' && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-500 text-white rounded">
                              Beta
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-zinc-500 mt-1">{tool.description}</p>
                      </div>

                      {/* Arrow */}
                      {tool.status !== 'coming-soon' && (
                        <ArrowRight className="h-5 w-5 text-zinc-600 group-hover:text-emerald-400 transition-colors" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Access Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <div className="flex items-center gap-4">
              <Zap className="h-5 w-5 text-emerald-400" />
              <span className="text-sm text-zinc-400">
                よく使うツール:
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => router.push('/generate')}
                  className="px-3 py-1.5 text-sm bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors"
                >
                  Kling AI
                </button>
                <button
                  onClick={() => router.push('/generate/heygen')}
                  className="px-3 py-1.5 text-sm bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors"
                >
                  HeyGen
                </button>
                <button
                  onClick={() => router.push('/generate/assets')}
                  className="px-3 py-1.5 text-sm bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors"
                >
                  アセット
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
