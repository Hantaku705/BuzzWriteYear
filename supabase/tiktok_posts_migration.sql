-- TikTok Posts Table Migration
-- Run this SQL in Supabase Dashboard > SQL Editor

-- TikTok投稿履歴
CREATE TABLE IF NOT EXISTS tiktok_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  tiktok_account_id UUID NOT NULL REFERENCES tiktok_accounts(id) ON DELETE CASCADE,
  publish_id VARCHAR(100),
  public_video_id VARCHAR(100),
  caption TEXT,
  hashtags TEXT[] DEFAULT '{}',
  privacy_level VARCHAR(50) DEFAULT 'PUBLIC_TO_EVERYONE',
  status VARCHAR(50) DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  posted_at TIMESTAMPTZ
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_tiktok_posts_video_id ON tiktok_posts(video_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_posts_account_id ON tiktok_posts(tiktok_account_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_posts_status ON tiktok_posts(status);

-- RLS有効化
ALTER TABLE tiktok_posts ENABLE ROW LEVEL SECURITY;

-- TikTok posts policies
DROP POLICY IF EXISTS "Users can view own tiktok posts" ON tiktok_posts;
CREATE POLICY "Users can view own tiktok posts"
  ON tiktok_posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM videos
      WHERE videos.id = tiktok_posts.video_id
      AND videos.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own tiktok posts" ON tiktok_posts;
CREATE POLICY "Users can insert own tiktok posts"
  ON tiktok_posts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM videos
      WHERE videos.id = tiktok_posts.video_id
      AND videos.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own tiktok posts" ON tiktok_posts;
CREATE POLICY "Users can update own tiktok posts"
  ON tiktok_posts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM videos
      WHERE videos.id = tiktok_posts.video_id
      AND videos.user_id = auth.uid()
    )
  );

-- Service role用ポリシー（ワーカーが投稿ステータス更新時に使用）
DROP POLICY IF EXISTS "Service role can manage tiktok posts" ON tiktok_posts;
CREATE POLICY "Service role can manage tiktok posts"
  ON tiktok_posts FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- videosテーブルにService roleポリシー追加（ワーカーがステータス更新時に使用）
DROP POLICY IF EXISTS "Service role can manage videos" ON videos;
CREATE POLICY "Service role can manage videos"
  ON videos FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
