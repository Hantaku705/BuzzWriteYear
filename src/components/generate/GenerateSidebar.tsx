'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Compass,
  FolderOpen,
  Sparkles,
  ImageIcon,
  Video,
  Layout,
  Grid3X3,
  Menu,
  Zap,
  ArrowLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const navigation = [
  { name: '探索', href: '/generate', icon: Compass },
  { name: 'アセット', href: '/generate/assets', icon: FolderOpen },
  { name: 'Kling O1', href: '/generate', icon: Sparkles, active: true, badge: null },
  { name: '画像生成', href: '/generate/image', icon: ImageIcon },
  { name: '動画生成', href: '/generate', icon: Video, badge: 'NEW' },
  { name: 'キャンバス', href: '/generate/canvas', icon: Layout },
  { name: 'すべてのツール', href: '/generate/tools', icon: Grid3X3 },
]

const bottomNavigation = [
  { name: 'API', href: '/settings', icon: Zap },
]

export function GenerateSidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex flex-col w-16 bg-zinc-900 border-r border-zinc-800">
      {/* Logo / Menu */}
      <div className="flex items-center justify-center h-14 border-b border-zinc-800">
        <Link href="/" className="p-2 rounded-lg hover:bg-zinc-800 transition-colors">
          <ArrowLeft className="h-5 w-5 text-zinc-400" />
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 flex flex-col items-center gap-1 py-4">
        {navigation.map((item) => {
          const isActive = item.active || pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'relative flex flex-col items-center justify-center w-12 h-12 rounded-lg transition-all',
                isActive
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] mt-1 leading-none">{item.name}</span>
              {item.badge && (
                <span className="absolute -top-1 -right-1 px-1 py-0.5 text-[8px] font-bold bg-emerald-500 text-white rounded">
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom Navigation */}
      <div className="flex flex-col items-center gap-2 py-4 border-t border-zinc-800">
        {bottomNavigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="flex flex-col items-center justify-center w-12 h-12 rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] mt-1">{item.name}</span>
          </Link>
        ))}

        {/* Credits */}
        <div className="flex flex-col items-center mt-2 p-2 bg-zinc-800 rounded-lg">
          <Zap className="h-4 w-4 text-emerald-400" />
          <span className="text-[10px] text-emerald-400 font-bold">8.3k</span>
          <span className="text-[8px] text-zinc-500">プレミア</span>
        </div>
      </div>
    </aside>
  )
}
