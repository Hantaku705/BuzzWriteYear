-- ============================================
-- BuzzWriteYear - 統合マイグレーション
-- Supabase SQL Editor で実行してください
-- ============================================

-- ============================================
-- 001: Initial Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 商品マスタ (TikTok Shop連携)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  images TEXT[] DEFAULT '{}',
  video_urls TEXT[] DEFAULT '{}',
  features JSONB DEFAULT '{}',
  tiktok_shop_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- テンプレート
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  content_type VARCHAR(50) NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  performance_score FLOAT DEFAULT 0,
  conversion_rate FLOAT DEFAULT 0,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 動画マスタ
CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  content_type VARCHAR(50) NOT NULL,
  generation_method VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  tiktok_video_id VARCHAR(100),
  local_path TEXT,
  remote_url TEXT,
  duration_seconds INTEGER,
  progress INTEGER DEFAULT 0,
  progress_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  posted_at TIMESTAMPTZ
);

-- 進捗カラムが存在しない場合に追加（既存DBへの対応）
ALTER TABLE videos ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS progress_message TEXT;

-- 分析データ (時系列)
CREATE TABLE IF NOT EXISTS video_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  orders INTEGER DEFAULT 0,
  gmv DECIMAL(12, 2) DEFAULT 0,
  avg_watch_time FLOAT,
  completion_rate FLOAT,
  UNIQUE(video_id, recorded_at)
);

-- 投稿スケジュール
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_product_id ON videos(product_id);
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
CREATE INDEX IF NOT EXISTS idx_video_analytics_video_id ON video_analytics(video_id);
CREATE INDEX IF NOT EXISTS idx_video_analytics_recorded_at ON video_analytics(recorded_at);
CREATE INDEX IF NOT EXISTS idx_schedules_video_id ON schedules(video_id);
CREATE INDEX IF NOT EXISTS idx_schedules_scheduled_at ON schedules(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_schedules_status ON schedules(status);

-- Row Level Security (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

-- Products policies
DROP POLICY IF EXISTS "Users can view own products" ON products;
CREATE POLICY "Users can view own products"
  ON products FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own products" ON products;
CREATE POLICY "Users can insert own products"
  ON products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own products" ON products;
CREATE POLICY "Users can update own products"
  ON products FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own products" ON products;
CREATE POLICY "Users can delete own products"
  ON products FOR DELETE
  USING (auth.uid() = user_id);

-- Videos policies
DROP POLICY IF EXISTS "Users can view own videos" ON videos;
CREATE POLICY "Users can view own videos"
  ON videos FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own videos" ON videos;
CREATE POLICY "Users can insert own videos"
  ON videos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own videos" ON videos;
CREATE POLICY "Users can update own videos"
  ON videos FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own videos" ON videos;
CREATE POLICY "Users can delete own videos"
  ON videos FOR DELETE
  USING (auth.uid() = user_id);

-- Video analytics policies
DROP POLICY IF EXISTS "Users can view own video analytics" ON video_analytics;
CREATE POLICY "Users can view own video analytics"
  ON video_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM videos
      WHERE videos.id = video_analytics.video_id
      AND videos.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own video analytics" ON video_analytics;
CREATE POLICY "Users can insert own video analytics"
  ON video_analytics FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM videos
      WHERE videos.id = video_analytics.video_id
      AND videos.user_id = auth.uid()
    )
  );

-- Schedules policies
DROP POLICY IF EXISTS "Users can view own schedules" ON schedules;
CREATE POLICY "Users can view own schedules"
  ON schedules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM videos
      WHERE videos.id = schedules.video_id
      AND videos.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own schedules" ON schedules;
CREATE POLICY "Users can insert own schedules"
  ON schedules FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM videos
      WHERE videos.id = schedules.video_id
      AND videos.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own schedules" ON schedules;
CREATE POLICY "Users can update own schedules"
  ON schedules FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM videos
      WHERE videos.id = schedules.video_id
      AND videos.user_id = auth.uid()
    )
  );

-- Templates are public read
DROP POLICY IF EXISTS "Anyone can view templates" ON templates;
CREATE POLICY "Anyone can view templates"
  ON templates FOR SELECT
  TO authenticated
  USING (true);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to products table
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default templates (only if not exists)
INSERT INTO templates (name, type, content_type, config)
SELECT * FROM (VALUES
  ('商品紹介 - ベーシック', 'remotion', 'product_intro', '{"style": "basic", "duration": 15}'::jsonb),
  ('Before/After 比較', 'remotion', 'before_after', '{"style": "split", "duration": 12}'::jsonb),
  ('レビュー風テキスト', 'remotion', 'review', '{"style": "text_animation", "duration": 10}'::jsonb),
  ('特徴リスト', 'remotion', 'product_intro', '{"style": "list", "duration": 15}'::jsonb),
  ('UGC風加工', 'ffmpeg', 'ugc', '{"filters": ["shake", "grain"], "duration": 15}'::jsonb)
) AS v(name, type, content_type, config)
WHERE NOT EXISTS (SELECT 1 FROM templates LIMIT 1);

-- ============================================
-- 002: TikTok OAuth Tables
-- ============================================

-- OAuth State（CSRF対策用）
CREATE TABLE IF NOT EXISTS oauth_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  state VARCHAR(255) NOT NULL UNIQUE,
  csrf_state VARCHAR(100),
  provider VARCHAR(50) NOT NULL DEFAULT 'tiktok',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TikTokアカウント
CREATE TABLE IF NOT EXISTS tiktok_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  open_id VARCHAR(100) NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  display_name VARCHAR(255),
  avatar_url TEXT,
  follower_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, open_id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_oauth_states_state ON oauth_states(state);
CREATE INDEX IF NOT EXISTS idx_oauth_states_user_id ON oauth_states(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at ON oauth_states(expires_at);
CREATE INDEX IF NOT EXISTS idx_tiktok_accounts_user_id ON tiktok_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_accounts_open_id ON tiktok_accounts(open_id);

-- RLS有効化
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiktok_accounts ENABLE ROW LEVEL SECURITY;

-- OAuth states policies
DROP POLICY IF EXISTS "Users can view own oauth states" ON oauth_states;
CREATE POLICY "Users can view own oauth states"
  ON oauth_states FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own oauth states" ON oauth_states;
CREATE POLICY "Users can insert own oauth states"
  ON oauth_states FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own oauth states" ON oauth_states;
CREATE POLICY "Users can delete own oauth states"
  ON oauth_states FOR DELETE
  USING (auth.uid() = user_id);

-- TikTok accounts policies
DROP POLICY IF EXISTS "Users can view own tiktok accounts" ON tiktok_accounts;
CREATE POLICY "Users can view own tiktok accounts"
  ON tiktok_accounts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own tiktok accounts" ON tiktok_accounts;
CREATE POLICY "Users can insert own tiktok accounts"
  ON tiktok_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own tiktok accounts" ON tiktok_accounts;
CREATE POLICY "Users can update own tiktok accounts"
  ON tiktok_accounts FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own tiktok accounts" ON tiktok_accounts;
CREATE POLICY "Users can delete own tiktok accounts"
  ON tiktok_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- Service role用ポリシー（ワーカーがトークン更新時に使用）
DROP POLICY IF EXISTS "Service role can manage oauth states" ON oauth_states;
CREATE POLICY "Service role can manage oauth states"
  ON oauth_states FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "Service role can manage tiktok accounts" ON tiktok_accounts;
CREATE POLICY "Service role can manage tiktok accounts"
  ON tiktok_accounts FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_tiktok_accounts_updated_at ON tiktok_accounts;
CREATE TRIGGER update_tiktok_accounts_updated_at
  BEFORE UPDATE ON tiktok_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 期限切れのOAuth stateを自動削除するための関数
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS void AS $$
BEGIN
  DELETE FROM oauth_states WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 004: Kling AI O1 Configuration
-- ============================================

-- 動画生成設定を保存するカラム（Kling AI O1機能用）
ALTER TABLE videos ADD COLUMN IF NOT EXISTS generation_config JSONB;

-- generation_configカラムの説明
COMMENT ON COLUMN videos.generation_config IS 'Kling AI generation parameters: modelVersion, aspectRatio, quality, cfgScale, enableAudio, hasEndKeyframe';

-- ============================================
-- 005: TikTok Posts Table
-- ============================================

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

-- Service role用ポリシー（ワーカーが動画ステータス更新時に使用）
DROP POLICY IF EXISTS "Service role can manage videos" ON videos;
CREATE POLICY "Service role can manage videos"
  ON videos FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- 006: UGC Style Learning
-- ============================================

-- UGCスタイルテンプレート
CREATE TABLE IF NOT EXISTS ugc_styles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- ステータス: analyzing | ready | failed
  status VARCHAR(50) NOT NULL DEFAULT 'analyzing',

  -- サンプル動画数
  sample_count INTEGER DEFAULT 0,

  -- 抽出されたスタイル特性（JSON）
  style_profile JSONB DEFAULT '{}',
  -- {
  --   cameraWork: { dominantStyle, shakeIntensity, zoomUsage, panUsage, commonMovements },
  --   editStyle: { pacing, avgClipDuration, transitionTypes, hasJumpCuts, beatSync },
  --   visualStyle: { colorTone, filterLook, contrast, saturation, dominantColors },
  --   motionStyle: { intensity, subjectMovement, cameraMovement },
  --   audioStyle: { hasBGM, hasVoiceover, musicGenre, sfxUsage }
  -- }

  -- 生成用パラメータ（style_profileから導出）
  generation_params JSONB DEFAULT '{}',
  -- {
  --   klingPromptSuffix: string,
  --   klingNegativePrompt: string,
  --   motionPresetId: string,
  --   cameraPresetId: string,
  --   ffmpegEffects: { effects: [], intensity: string }
  -- }

  -- キーワード・全体の雰囲気
  keywords TEXT[] DEFAULT '{}',
  overall_vibe TEXT,

  -- サムネイル（代表的なサンプルから）
  thumbnail_url TEXT,

  -- エラーメッセージ（status='failed'時）
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- UGCスタイルのサンプル動画
CREATE TABLE IF NOT EXISTS ugc_style_samples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ugc_style_id UUID NOT NULL REFERENCES ugc_styles(id) ON DELETE CASCADE,

  -- 動画情報
  video_url TEXT NOT NULL,
  filename VARCHAR(255),
  duration_seconds FLOAT,
  file_size_bytes BIGINT,

  -- Gemini分析結果（JSON）
  analysis_result JSONB DEFAULT '{}',
  -- {
  --   cameraWork: { movements, stability, framing },
  --   editStyle: { pacing, avgClipDuration, transitionTypes, hasJumpCuts },
  --   visualStyle: { dominantColors, contrast, saturation, filterLook },
  --   motionContent: { subjectType, motionIntensity, keyActions },
  --   audio: { hasBGM, hasVoiceover, musicGenre },
  --   overallDescription: string
  -- }

  -- 分析ステータス: pending | analyzing | completed | failed
  analysis_status VARCHAR(50) DEFAULT 'pending',

  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_ugc_styles_user_id ON ugc_styles(user_id);
CREATE INDEX IF NOT EXISTS idx_ugc_styles_status ON ugc_styles(status);
CREATE INDEX IF NOT EXISTS idx_ugc_style_samples_style_id ON ugc_style_samples(ugc_style_id);
CREATE INDEX IF NOT EXISTS idx_ugc_style_samples_status ON ugc_style_samples(analysis_status);

-- RLS有効化
ALTER TABLE ugc_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ugc_style_samples ENABLE ROW LEVEL SECURITY;

-- UGC Styles policies
DROP POLICY IF EXISTS "Users can view own ugc_styles" ON ugc_styles;
CREATE POLICY "Users can view own ugc_styles"
  ON ugc_styles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own ugc_styles" ON ugc_styles;
CREATE POLICY "Users can insert own ugc_styles"
  ON ugc_styles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own ugc_styles" ON ugc_styles;
CREATE POLICY "Users can update own ugc_styles"
  ON ugc_styles FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own ugc_styles" ON ugc_styles;
CREATE POLICY "Users can delete own ugc_styles"
  ON ugc_styles FOR DELETE
  USING (auth.uid() = user_id);

-- UGC Style Samples policies（親テーブル経由でアクセス制御）
DROP POLICY IF EXISTS "Users can view own ugc_style_samples" ON ugc_style_samples;
CREATE POLICY "Users can view own ugc_style_samples"
  ON ugc_style_samples FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ugc_styles
      WHERE ugc_styles.id = ugc_style_samples.ugc_style_id
      AND ugc_styles.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own ugc_style_samples" ON ugc_style_samples;
CREATE POLICY "Users can insert own ugc_style_samples"
  ON ugc_style_samples FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ugc_styles
      WHERE ugc_styles.id = ugc_style_samples.ugc_style_id
      AND ugc_styles.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own ugc_style_samples" ON ugc_style_samples;
CREATE POLICY "Users can delete own ugc_style_samples"
  ON ugc_style_samples FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM ugc_styles
      WHERE ugc_styles.id = ugc_style_samples.ugc_style_id
      AND ugc_styles.user_id = auth.uid()
    )
  );

-- Service role用ポリシー（ワーカーが分析結果更新時に使用）
DROP POLICY IF EXISTS "Service role can manage ugc_styles" ON ugc_styles;
CREATE POLICY "Service role can manage ugc_styles"
  ON ugc_styles FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "Service role can manage ugc_style_samples" ON ugc_style_samples;
CREATE POLICY "Service role can manage ugc_style_samples"
  ON ugc_style_samples FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_ugc_styles_updated_at ON ugc_styles;
CREATE TRIGGER update_ugc_styles_updated_at
  BEFORE UPDATE ON ugc_styles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- マイグレーション完了
-- ============================================
