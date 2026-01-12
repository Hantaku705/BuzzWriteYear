'use client'

import { useState, useRef } from 'react'
import {
  Layout,
  Square,
  Circle,
  Type,
  ImageIcon,
  Pencil,
  Eraser,
  Move,
  ZoomIn,
  ZoomOut,
  Undo,
  Redo,
  Layers,
  Download,
  Upload,
  Palette,
  MousePointer,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import { GenerateSidebar } from '@/components/generate/GenerateSidebar'
import { toast } from 'sonner'

type Tool = 'select' | 'move' | 'pen' | 'eraser' | 'rectangle' | 'circle' | 'text' | 'image'

const tools = [
  { id: 'select', name: '選択', icon: MousePointer },
  { id: 'move', name: '移動', icon: Move },
  { id: 'pen', name: 'ペン', icon: Pencil },
  { id: 'eraser', name: '消しゴム', icon: Eraser },
  { id: 'rectangle', name: '四角形', icon: Square },
  { id: 'circle', name: '円', icon: Circle },
  { id: 'text', name: 'テキスト', icon: Type },
  { id: 'image', name: '画像', icon: ImageIcon },
]

const colors = [
  '#ffffff', '#000000', '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899',
]

export default function CanvasPage() {
  const [selectedTool, setSelectedTool] = useState<Tool>('select')
  const [brushSize, setBrushSize] = useState([5])
  const [selectedColor, setSelectedColor] = useState('#ffffff')
  const [zoom, setZoom] = useState(100)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const handleExport = () => {
    toast.info('キャンバス機能は現在準備中です')
  }

  const handleImport = () => {
    toast.info('キャンバス機能は現在準備中です')
  }

  return (
    <div className="flex h-screen bg-zinc-950">
      <GenerateSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <Layout className="h-5 w-5 text-emerald-400" />
              キャンバス
            </h1>
            <span className="px-2 py-0.5 text-[10px] bg-yellow-500 text-black rounded font-bold">
              Coming Soon
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Undo/Redo */}
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
              <Undo className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
              <Redo className="h-4 w-4" />
            </Button>

            <div className="w-px h-6 bg-zinc-700 mx-2" />

            {/* Zoom */}
            <Button
              variant="ghost"
              size="sm"
              className="text-zinc-400 hover:text-white"
              onClick={() => setZoom(Math.max(25, zoom - 25))}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-zinc-400 min-w-[50px] text-center">{zoom}%</span>
            <Button
              variant="ghost"
              size="sm"
              className="text-zinc-400 hover:text-white"
              onClick={() => setZoom(Math.min(200, zoom + 25))}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>

            <div className="w-px h-6 bg-zinc-700 mx-2" />

            {/* Actions */}
            <Button
              variant="outline"
              size="sm"
              className="border-zinc-700"
              onClick={handleImport}
            >
              <Upload className="h-4 w-4 mr-2" />
              インポート
            </Button>
            <Button
              size="sm"
              className="bg-emerald-500 hover:bg-emerald-600"
              onClick={handleExport}
            >
              <Download className="h-4 w-4 mr-2" />
              エクスポート
            </Button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Toolbar */}
          <div className="w-14 bg-zinc-900 border-r border-zinc-800 p-2 flex flex-col gap-1">
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => setSelectedTool(tool.id as Tool)}
                className={cn(
                  'w-10 h-10 flex items-center justify-center rounded-lg transition-all',
                  selectedTool === tool.id
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                )}
                title={tool.name}
              >
                <tool.icon className="h-5 w-5" />
              </button>
            ))}

            <div className="flex-1" />

            {/* Delete */}
            <button
              className="w-10 h-10 flex items-center justify-center rounded-lg text-zinc-400 hover:bg-red-500/20 hover:text-red-400 transition-all"
              title="削除"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>

          {/* Canvas Area */}
          <div className="flex-1 bg-zinc-950 flex items-center justify-center overflow-auto p-8">
            <div
              className="bg-zinc-800 rounded-lg shadow-2xl relative"
              style={{
                width: `${(1080 * zoom) / 100}px`,
                height: `${(1920 * zoom) / 100}px`,
                maxWidth: '100%',
                maxHeight: '100%',
              }}
            >
              {/* Canvas placeholder */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Layout className="h-16 w-16 text-zinc-700 mx-auto mb-4" />
                  <p className="text-zinc-500">キャンバス機能は準備中です</p>
                  <p className="text-zinc-600 text-sm mt-2">
                    画像編集・合成機能を近日公開予定
                  </p>
                </div>
              </div>

              {/* Grid overlay */}
              <div
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                  backgroundImage: `
                    linear-gradient(to right, #ffffff 1px, transparent 1px),
                    linear-gradient(to bottom, #ffffff 1px, transparent 1px)
                  `,
                  backgroundSize: '20px 20px',
                }}
              />
            </div>
          </div>

          {/* Right Panel - Properties */}
          <div className="w-64 bg-zinc-900 border-l border-zinc-800 p-4 space-y-6">
            {/* Tool Settings */}
            <div>
              <h3 className="text-sm font-medium text-white mb-3">ツール設定</h3>
              <div className="space-y-4">
                {/* Brush Size */}
                {(selectedTool === 'pen' || selectedTool === 'eraser') && (
                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-xs text-zinc-400">ブラシサイズ</label>
                      <span className="text-xs text-emerald-400">{brushSize[0]}px</span>
                    </div>
                    <Slider
                      value={brushSize}
                      onValueChange={setBrushSize}
                      min={1}
                      max={50}
                      step={1}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Colors */}
            <div>
              <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <Palette className="h-4 w-4" />
                カラー
              </h3>
              <div className="grid grid-cols-5 gap-2">
                {colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={cn(
                      'w-8 h-8 rounded-lg border-2 transition-all',
                      selectedColor === color
                        ? 'border-emerald-400 scale-110'
                        : 'border-transparent hover:scale-105'
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="mt-3">
                <input
                  type="color"
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="w-full h-8 rounded cursor-pointer"
                />
              </div>
            </div>

            {/* Layers */}
            <div>
              <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <Layers className="h-4 w-4" />
                レイヤー
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 bg-zinc-800 rounded-lg border border-emerald-500/50">
                  <div className="w-8 h-8 bg-zinc-700 rounded" />
                  <span className="text-sm text-white">背景</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-dashed border-zinc-700 text-zinc-400"
                >
                  + レイヤーを追加
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
