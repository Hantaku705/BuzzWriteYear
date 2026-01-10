'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Package,
  Video,
  LayoutTemplate,
  BarChart3,
  Settings,
  Home,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'ダッシュボード', href: '/', icon: Home },
  { name: '商品管理', href: '/products', icon: Package },
  { name: '動画管理', href: '/videos', icon: Video },
  { name: 'テンプレート', href: '/templates', icon: LayoutTemplate },
  { name: '分析', href: '/analytics', icon: BarChart3 },
  { name: '設定', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-zinc-950 border-r border-zinc-800">
      <div className="flex h-16 items-center gap-2 px-6 border-b border-zinc-800">
        <Video className="h-8 w-8 text-pink-500" />
        <span className="text-xl font-bold text-white">BuzzWriteYear</span>
      </div>
      <nav className="flex flex-col gap-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-pink-500/10 text-pink-500'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
