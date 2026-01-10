import Link from 'next/link'
import { AuthForm } from '@/components/auth/AuthForm'

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold text-white">BuzzWriteYear</h1>
        <p className="text-zinc-400">新規アカウント作成</p>
      </div>

      <AuthForm mode="signup" />

      <p className="text-center text-sm text-zinc-400">
        すでにアカウントをお持ちの方は{' '}
        <Link href="/login" className="text-pink-500 hover:underline">
          ログイン
        </Link>
      </p>
    </div>
  )
}
