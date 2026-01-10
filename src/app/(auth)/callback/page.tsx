'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

export default function CallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = createClient()

      const { error } = await supabase.auth.exchangeCodeForSession(
        window.location.href
      )

      if (error) {
        console.error('Auth callback error:', error)
        router.push('/login?error=callback_failed')
      } else {
        router.push('/')
      }
    }

    handleCallback()
  }, [router])

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
      <p className="text-zinc-400">認証を確認中...</p>
    </div>
  )
}
