import Link from 'next/link'
import { AuthForm } from '@/components/auth/AuthForm'

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold text-white">BuzzWriteYear</h1>
        <p className="text-zinc-400">アカウントにログイン</p>
      </div>

      <AuthForm mode="login" />

      <p className="text-center text-sm text-zinc-400">
        アカウントをお持ちでない方は{' '}
        <Link href="/signup" className="text-pink-500 hover:underline">
          新規登録
        </Link>
      </p>
    </div>
  )
}
