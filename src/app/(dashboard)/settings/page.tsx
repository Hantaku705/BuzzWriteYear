'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Settings,
  Key,
  Link2,
  CheckCircle,
  XCircle,
  ExternalLink,
  User,
  Loader2,
  LogOut,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export default function SettingsPage() {
  const { user, loading, signOut } = useAuth()
  const [saving, setSaving] = useState(false)

  // Check environment variables for connection status
  const tiktokConnected = Boolean(process.env.NEXT_PUBLIC_TIKTOK_CONNECTED)
  const heygenConnected = Boolean(process.env.NEXT_PUBLIC_HEYGEN_CONNECTED)

  const connections = [
    {
      name: 'TikTok',
      description: 'TikTok for Developers API',
      connected: tiktokConnected,
      icon: '🎵',
    },
    {
      name: 'HeyGen',
      description: 'AIアバター動画生成',
      connected: heygenConnected,
      icon: '🤖',
    },
    {
      name: 'Supabase',
      description: 'データベース・ストレージ',
      connected: true,
      icon: '⚡',
    },
  ]

  const handleLogout = async () => {
    await signOut()
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">設定</h1>
        <p className="text-zinc-400">API連携とアプリケーション設定</p>
      </div>

      {/* Profile */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <User className="h-5 w-5" />
            プロフィール
          </CardTitle>
          <CardDescription className="text-zinc-400">
            アカウント情報
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 py-4">
              <Loader2 className="h-5 w-5 animate-spin text-pink-500" />
              <span className="text-zinc-400">読み込み中...</span>
            </div>
          ) : user ? (
            <>
              <div className="flex items-center gap-4 py-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-pink-500 text-white text-2xl font-bold">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-lg font-medium text-white">{user.email}</p>
                  <p className="text-sm text-zinc-400">
                    登録日: {new Date(user.created_at).toLocaleDateString('ja-JP')}
                  </p>
                </div>
              </div>
              <Separator className="bg-zinc-800" />
              <div className="flex justify-end pt-2">
                <Button
                  variant="outline"
                  className="border-red-500/50 text-red-500 hover:bg-red-500/10"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  ログアウト
                </Button>
              </div>
            </>
          ) : (
            <p className="text-zinc-400 py-4">ログインしていません</p>
          )}
        </CardContent>
      </Card>

      {/* API Connections */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            API連携
          </CardTitle>
          <CardDescription className="text-zinc-400">
            外部サービスとの連携を管理
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {connections.map((connection, index) => (
            <div key={connection.name}>
              <div className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-800 text-2xl">
                    {connection.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white">{connection.name}</p>
                      {connection.connected ? (
                        <Badge className="bg-green-500/10 text-green-500">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          接続済み
                        </Badge>
                      ) : (
                        <Badge className="bg-zinc-500/10 text-zinc-400">
                          <XCircle className="mr-1 h-3 w-3" />
                          未接続
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-zinc-400">{connection.description}</p>
                  </div>
                </div>
                <Button
                  variant={connection.connected ? 'outline' : 'default'}
                  className={connection.connected ? 'border-zinc-700' : 'bg-pink-500 hover:bg-pink-600'}
                  disabled={connection.name === 'Supabase'}
                >
                  {connection.connected ? '設定' : '接続'}
                </Button>
              </div>
              {index < connections.length - 1 && <Separator className="bg-zinc-800" />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* TikTok API Settings */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Key className="h-5 w-5" />
            TikTok API設定
          </CardTitle>
          <CardDescription className="text-zinc-400">
            TikTok for Developers APIキーを設定（環境変数で管理）
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-zinc-800/50 rounded-lg">
            <p className="text-sm text-zinc-400">
              TikTok APIの設定は、セキュリティのため環境変数で管理されています。
              <br />
              <code className="text-pink-500">TIKTOK_CLIENT_KEY</code> と
              <code className="text-pink-500 ml-1">TIKTOK_CLIENT_SECRET</code> を
              <code className="text-pink-500 ml-1">.env.local</code> に設定してください。
            </p>
          </div>
          <div className="flex items-center justify-between pt-2">
            <a
              href="https://developers.tiktok.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-pink-500 hover:text-pink-400 flex items-center gap-1"
            >
              TikTok for Developersでキーを取得
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </CardContent>
      </Card>

      {/* HeyGen API Settings */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Key className="h-5 w-5" />
            HeyGen API設定
          </CardTitle>
          <CardDescription className="text-zinc-400">
            HeyGen APIキーを設定してAIアバター動画を生成
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-zinc-800/50 rounded-lg">
            <p className="text-sm text-zinc-400">
              HeyGen APIの設定は、セキュリティのため環境変数で管理されています。
              <br />
              <code className="text-pink-500">HEYGEN_API_KEY</code> を
              <code className="text-pink-500 ml-1">.env.local</code> に設定してください。
            </p>
          </div>
          <div className="flex items-center justify-between pt-2">
            <a
              href="https://www.heygen.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-pink-500 hover:text-pink-400 flex items-center gap-1"
            >
              HeyGenでAPIキーを取得
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </CardContent>
      </Card>

      {/* General Settings */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Settings className="h-5 w-5" />
            一般設定
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="default-duration" className="text-white">
              デフォルト動画時間（秒）
            </Label>
            <Input
              id="default-duration"
              type="number"
              defaultValue={15}
              className="bg-zinc-800 border-zinc-700 w-32"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timezone" className="text-white">
              タイムゾーン
            </Label>
            <Input
              id="timezone"
              defaultValue="Asia/Tokyo"
              className="bg-zinc-800 border-zinc-700 w-64"
              disabled
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
