/**
 * DBマイグレーション実行スクリプト
 *
 * 使用方法:
 * DB_PASSWORD=your_password node scripts/run-migration.js
 */

const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

async function runMigration() {
  const password = process.env.DB_PASSWORD

  if (!password) {
    console.error('Error: DB_PASSWORD environment variable is required')
    console.log('\nUsage: DB_PASSWORD=your_password node scripts/run-migration.js')
    process.exit(1)
  }

  // Supabase接続文字列（直接接続）
  const connectionString = `postgresql://postgres:${password}@db.dziamclndwokodzcczpq.supabase.co:5432/postgres`

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  })

  try {
    console.log('Connecting to database...')
    await client.connect()
    console.log('Connected!')

    // マイグレーションSQL
    const sql = `
      ALTER TABLE videos ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;
      ALTER TABLE videos ADD COLUMN IF NOT EXISTS progress_message TEXT;
      COMMENT ON COLUMN videos.progress IS '生成進捗 (0-100%)';
      COMMENT ON COLUMN videos.progress_message IS '進捗メッセージ';
    `

    console.log('Running migration...')
    await client.query(sql)
    console.log('Migration completed successfully!')

  } catch (error) {
    console.error('Migration failed:', error.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

runMigration()
