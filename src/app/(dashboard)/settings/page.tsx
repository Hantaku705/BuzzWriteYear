'use client'

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
} from 'lucide-react'

const connections = [
  {
    name: 'TikTok',
    description: 'TikTok for Developers API',
    connected: false,
    icon: '🎵',
  },
  {
    name: 'HeyGen',
    description: 'AIアバター動画生成',
    connected: false,
    icon: '🤖',
  },
  {
    name: 'Supabase',
    description: 'データベース・ストレージ',
    connected: true,
    icon: '⚡',
  },
]

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">設定</h1>
        <p className="text-zinc-400">API連携とアプリケーション設定</p>
      </div>

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
            TikTok for Developers APIキーを設定
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tiktok-client-key" className="text-white">
              Client Key
            </Label>
            <Input
              id="tiktok-client-key"
              type="password"
              placeholder="••••••••••••••••"
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tiktok-client-secret" className="text-white">
              Client Secret
            </Label>
            <Input
              id="tiktok-client-secret"
              type="password"
              placeholder="••••••••••••••••"
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
          <div className="flex items-center justify-between pt-4">
            <a
              href="https://developers.tiktok.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-pink-500 hover:text-pink-400 flex items-center gap-1"
            >
              TikTok for Developersでキーを取得
              <ExternalLink className="h-3 w-3" />
            </a>
            <Button className="bg-pink-500 hover:bg-pink-600">保存</Button>
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
          <div className="space-y-2">
            <Label htmlFor="heygen-api-key" className="text-white">
              API Key
            </Label>
            <Input
              id="heygen-api-key"
              type="password"
              placeholder="••••••••••••••••"
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
          <div className="flex items-center justify-between pt-4">
            <a
              href="https://www.heygen.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-pink-500 hover:text-pink-400 flex items-center gap-1"
            >
              HeyGenでAPIキーを取得
              <ExternalLink className="h-3 w-3" />
            </a>
            <Button className="bg-pink-500 hover:bg-pink-600">保存</Button>
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
