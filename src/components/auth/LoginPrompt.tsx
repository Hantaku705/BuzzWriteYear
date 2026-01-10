'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LogIn } from 'lucide-react'

interface LoginPromptProps {
  title?: string
  description?: string
}

export function LoginPrompt({
  title = 'ログインして履歴を見る',
  description = 'Googleアカウントでログインすると、作成した商品や動画の履歴を保存・管理できます。',
}: LoginPromptProps) {
  const router = useRouter()

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-pink-500/10 mb-4">
          <LogIn className="h-8 w-8 text-pink-500" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
        <p className="text-zinc-400 max-w-md mb-6">{description}</p>
        <Button
          className="bg-pink-500 hover:bg-pink-600"
          onClick={() => router.push('/login')}
        >
          <LogIn className="mr-2 h-4 w-4" />
          ログイン
        </Button>
      </CardContent>
    </Card>
  )
}
