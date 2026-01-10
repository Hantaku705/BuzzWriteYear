-- TikTok OAuth関連テーブル

-- OAuth State（CSRF対策用）
CREATE TABLE oauth_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  state VARCHAR(255) NOT NULL UNIQUE,
  csrf_state VARCHAR(100),
  provider VARCHAR(50) NOT NULL DEFAULT 'tiktok',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TikTokアカウント
CREATE TABLE tiktok_accounts (
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
CREATE INDEX idx_oauth_states_state ON oauth_states(state);
CREATE INDEX idx_oauth_states_user_id ON oauth_states(user_id);
CREATE INDEX idx_oauth_states_expires_at ON oauth_states(expires_at);
CREATE INDEX idx_tiktok_accounts_user_id ON tiktok_accounts(user_id);
CREATE INDEX idx_tiktok_accounts_open_id ON tiktok_accounts(open_id);

-- RLS有効化
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiktok_accounts ENABLE ROW LEVEL SECURITY;

-- OAuth states policies
CREATE POLICY "Users can view own oauth states"
  ON oauth_states FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own oauth states"
  ON oauth_states FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own oauth states"
  ON oauth_states FOR DELETE
  USING (auth.uid() = user_id);

-- TikTok accounts policies
CREATE POLICY "Users can view own tiktok accounts"
  ON tiktok_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tiktok accounts"
  ON tiktok_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tiktok accounts"
  ON tiktok_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tiktok accounts"
  ON tiktok_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- Service role用ポリシー（ワーカーがトークン更新時に使用）
CREATE POLICY "Service role can manage oauth states"
  ON oauth_states FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage tiktok accounts"
  ON tiktok_accounts FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Updated_at trigger
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
