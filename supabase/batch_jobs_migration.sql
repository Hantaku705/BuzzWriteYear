-- Batch Jobs Table Migration
-- バッチジョブ管理

-- バッチジョブテーブル
CREATE TABLE IF NOT EXISTS batch_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'heygen' | 'kling'
  name TEXT,
  status TEXT DEFAULT 'pending', -- 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  total_count INTEGER NOT NULL DEFAULT 0,
  completed_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  config JSONB, -- 共通設定（アバター、ボイス、モデル等）
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- バッチジョブアイテムテーブル
CREATE TABLE IF NOT EXISTS batch_job_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_job_id UUID NOT NULL REFERENCES batch_jobs(id) ON DELETE CASCADE,
  video_id UUID REFERENCES videos(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending', -- 'pending' | 'processing' | 'completed' | 'failed'
  item_index INTEGER NOT NULL, -- CSVの行番号
  config JSONB, -- 個別設定（スクリプト、タイトル等）
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_batch_jobs_user_id ON batch_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_batch_jobs_status ON batch_jobs(status);
CREATE INDEX IF NOT EXISTS idx_batch_jobs_created_at ON batch_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_batch_job_items_batch_job_id ON batch_job_items(batch_job_id);
CREATE INDEX IF NOT EXISTS idx_batch_job_items_status ON batch_job_items(status);

-- RLS有効化
ALTER TABLE batch_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_job_items ENABLE ROW LEVEL SECURITY;

-- Batch jobs policies
DROP POLICY IF EXISTS "Users can view own batch jobs" ON batch_jobs;
CREATE POLICY "Users can view own batch jobs"
  ON batch_jobs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own batch jobs" ON batch_jobs;
CREATE POLICY "Users can insert own batch jobs"
  ON batch_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own batch jobs" ON batch_jobs;
CREATE POLICY "Users can update own batch jobs"
  ON batch_jobs FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own batch jobs" ON batch_jobs;
CREATE POLICY "Users can delete own batch jobs"
  ON batch_jobs FOR DELETE
  USING (auth.uid() = user_id);

-- Service role用ポリシー
DROP POLICY IF EXISTS "Service role can manage batch jobs" ON batch_jobs;
CREATE POLICY "Service role can manage batch jobs"
  ON batch_jobs FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Batch job items policies
DROP POLICY IF EXISTS "Users can view own batch job items" ON batch_job_items;
CREATE POLICY "Users can view own batch job items"
  ON batch_job_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM batch_jobs
      WHERE batch_jobs.id = batch_job_items.batch_job_id
      AND batch_jobs.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own batch job items" ON batch_job_items;
CREATE POLICY "Users can insert own batch job items"
  ON batch_job_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM batch_jobs
      WHERE batch_jobs.id = batch_job_items.batch_job_id
      AND batch_jobs.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own batch job items" ON batch_job_items;
CREATE POLICY "Users can update own batch job items"
  ON batch_job_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM batch_jobs
      WHERE batch_jobs.id = batch_job_items.batch_job_id
      AND batch_jobs.user_id = auth.uid()
    )
  );

-- Service role用ポリシー
DROP POLICY IF EXISTS "Service role can manage batch job items" ON batch_job_items;
CREATE POLICY "Service role can manage batch job items"
  ON batch_job_items FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
