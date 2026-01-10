-- 動画生成進捗フィールドを追加
ALTER TABLE videos ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS progress_message TEXT;

-- コメント
COMMENT ON COLUMN videos.progress IS '生成進捗 (0-100%)';
COMMENT ON COLUMN videos.progress_message IS '進捗メッセージ';
