-- BuzzWriteYear Database Schema
-- TikTok Shop GMV最大化のための動画自動生成プラットフォーム

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 商品マスタ (TikTok Shop連携)
CREATE TABLE products (
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
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL, -- remotion, heygen, ffmpeg
  content_type VARCHAR(50) NOT NULL, -- product_intro, before_after, review, etc.
  config JSONB NOT NULL DEFAULT '{}',
  performance_score FLOAT DEFAULT 0,
  conversion_rate FLOAT DEFAULT 0,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 動画マスタ
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  content_type VARCHAR(50) NOT NULL, -- product_intro, before_after, ugc, avatar, etc.
  generation_method VARCHAR(50) NOT NULL, -- remotion, heygen, ffmpeg
  status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, generating, ready, posting, posted, failed
  tiktok_video_id VARCHAR(100),
  local_path TEXT,
  remote_url TEXT,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  posted_at TIMESTAMPTZ
);

-- 分析データ (時系列)
CREATE TABLE video_analytics (
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
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_products_user_id ON products(user_id);
CREATE INDEX idx_videos_user_id ON videos(user_id);
CREATE INDEX idx_videos_product_id ON videos(product_id);
CREATE INDEX idx_videos_status ON videos(status);
CREATE INDEX idx_video_analytics_video_id ON video_analytics(video_id);
CREATE INDEX idx_video_analytics_recorded_at ON video_analytics(recorded_at);
CREATE INDEX idx_schedules_video_id ON schedules(video_id);
CREATE INDEX idx_schedules_scheduled_at ON schedules(scheduled_at);
CREATE INDEX idx_schedules_status ON schedules(status);

-- Row Level Security (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

-- Products policies
CREATE POLICY "Users can view own products"
  ON products FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own products"
  ON products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own products"
  ON products FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own products"
  ON products FOR DELETE
  USING (auth.uid() = user_id);

-- Videos policies
CREATE POLICY "Users can view own videos"
  ON videos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own videos"
  ON videos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own videos"
  ON videos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own videos"
  ON videos FOR DELETE
  USING (auth.uid() = user_id);

-- Video analytics policies
CREATE POLICY "Users can view own video analytics"
  ON video_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM videos
      WHERE videos.id = video_analytics.video_id
      AND videos.user_id = auth.uid()
    )
  );

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
CREATE POLICY "Users can view own schedules"
  ON schedules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM videos
      WHERE videos.id = schedules.video_id
      AND videos.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own schedules"
  ON schedules FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM videos
      WHERE videos.id = schedules.video_id
      AND videos.user_id = auth.uid()
    )
  );

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
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default templates
INSERT INTO templates (name, type, content_type, config) VALUES
  ('商品紹介 - ベーシック', 'remotion', 'product_intro', '{"style": "basic", "duration": 15}'),
  ('Before/After 比較', 'remotion', 'before_after', '{"style": "split", "duration": 12}'),
  ('レビュー風テキスト', 'remotion', 'review', '{"style": "text_animation", "duration": 10}'),
  ('特徴リスト', 'remotion', 'product_intro', '{"style": "list", "duration": 15}'),
  ('UGC風加工', 'ffmpeg', 'ugc', '{"filters": ["shake", "grain"], "duration": 15}');
