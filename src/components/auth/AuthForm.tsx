'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

interface AuthFormProps {
  mode: 'login' | 'signup'
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    const supabase = createClient()

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/callback`,
          },
        })

        if (error) throw error

        setMessage('確認メールを送信しました。メールを確認してください。')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        router.push('/')
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="email">メールアドレス</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
          required
          className="bg-zinc-900 border-zinc-800"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">パスワード</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          minLength={6}
          className="bg-zinc-900 border-zinc-800"
        />
      </div>

      {error && (
        <div className="p-3 text-sm text-red-500 bg-red-500/10 rounded-md">
          {error}
        </div>
      )}

      {message && (
        <div className="p-3 text-sm text-green-500 bg-green-500/10 rounded-md">
          {message}
        </div>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-pink-500 hover:bg-pink-600"
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {mode === 'login' ? 'ログイン' : 'アカウント作成'}
      </Button>
    </form>
  )
}
