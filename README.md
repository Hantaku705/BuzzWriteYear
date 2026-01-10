This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Deploy Worker on Railway

本番環境で動画生成ワーカーを常時起動するには、Railwayを使用します。

### Railway CLI セットアップ

1. Railway CLIをインストール（未インストールの場合）:
   ```bash
   npm install -g @railway/cli
   ```

2. Railwayにログイン（ブラウザで認証が必要）:
   ```bash
   railway login
   ```
   **注意**: 非対話モードでは実行できません。ターミナルで手動実行してください。

### Railway プロジェクト作成

1. Railwayプロジェクトを作成:
   ```bash
   railway init
   ```

2. 環境変数を設定:
   RailwayダッシュボードまたはCLIで以下の環境変数を設定:
   ```
   REDIS_URL=rediss://...
   NEXT_PUBLIC_SUPABASE_URL=https://...
   SUPABASE_SERVICE_ROLE_KEY=...
   KLING_API_KEY=...
   ```

3. デプロイ:
   ```bash
   railway up
   ```

### ワーカー設定

`railway-worker.toml` が自動的に使用され、以下の設定でワーカーが起動します:
- ビルダー: Nixpacks
- 起動コマンド: `npm run worker:prod`
- 再起動ポリシー: always

### ローカルでワーカー起動

本番環境の動作確認やデバッグには、ローカルでワーカーを起動できます:

```bash
npx dotenv -e .env.local -- npx tsx scripts/start-worker.ts
```
