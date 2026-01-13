#!/usr/bin/env npx tsx
/**
 * スタイル適用動画生成スクリプト
 *
 * 使用方法:
 *   npx dotenv -e .env.local -- npx tsx scripts/generate-like.ts <style_id> --image <image_url> [--text <text>]
 *
 * 例:
 *   npx dotenv -e .env.local -- npx tsx scripts/generate-like.ts luana_beauty_2nd --image https://example.com/product.jpg --text "新商品紹介"
 *
 * 出力:
 *   output/generated/<style_id>_<timestamp>.mp4
 */

import { readFile, mkdir, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join, basename } from 'path'
import {
  generateImageToVideo,
  waitForCompletion,
  downloadVideo,
} from '../src/lib/video/kling/client'
import {
  processUGCVideo,
  type UGCEffect,
} from '../src/lib/video/ffmpeg/ugc-processor'
import {
  addTextOverlay,
  type SubtitleStyle,
} from '../src/lib/video/ffmpeg/subtitle'
import type { UGCStyleExportJSON } from '../src/types/ugc-style'

// 引数解析
interface CLIArgs {
  styleId: string
  imageUrl: string
  text?: string
  outputDir?: string
  skipUgc?: boolean
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.error(`
使用方法:
  npx tsx scripts/generate-like.ts <style_id> --image <image_url> [--text <text>]

オプション:
  --image <url>     商品画像のURL（必須）
  --text <text>     動画に表示するテキスト（オプション）
  --output <dir>    出力ディレクトリ（デフォルト: output/generated）
  --skip-ugc        UGC加工をスキップ

例:
  npx tsx scripts/generate-like.ts luana_beauty_2nd --image https://example.com/product.jpg
`)
    process.exit(1)
  }

  const styleId = args[0]
  let imageUrl: string | undefined
  let text: string | undefined
  let outputDir: string | undefined
  let skipUgc = false

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--image' && args[i + 1]) {
      imageUrl = args[++i]
    } else if (args[i] === '--text' && args[i + 1]) {
      text = args[++i]
    } else if (args[i] === '--output' && args[i + 1]) {
      outputDir = args[++i]
    } else if (args[i] === '--skip-ugc') {
      skipUgc = true
    }
  }

  if (!imageUrl) {
    console.error('エラー: --image オプションは必須です')
    process.exit(1)
  }

  return { styleId, imageUrl, text, outputDir, skipUgc }
}

/**
 * スタイルテンプレートを読み込む
 */
async function loadStyleTemplate(styleId: string): Promise<UGCStyleExportJSON> {
  const stylesDir = join(process.cwd(), 'docs', 'account-analysis', 'styles')
  const filepath = join(stylesDir, `${styleId}.json`)

  if (!existsSync(filepath)) {
    throw new Error(`スタイルテンプレートが見つかりません: ${filepath}`)
  }

  const content = await readFile(filepath, 'utf-8')
  return JSON.parse(content) as UGCStyleExportJSON
}

/**
 * メイン処理
 */
async function main() {
  const args = parseArgs()

  // 環境変数チェック
  if (!process.env.KLING_API_KEY) {
    console.error('エラー: KLING_API_KEY が設定されていません')
    process.exit(1)
  }

  console.log('====================================')
  console.log('スタイル適用動画生成')
  console.log('====================================\n')

  try {
    // 1. スタイルテンプレート読み込み
    console.log(`[1/5] スタイルテンプレート読み込み: ${args.styleId}`)
    const template = await loadStyleTemplate(args.styleId)
    console.log(`  ✓ ${template.name}`)
    console.log(`  ✓ 雰囲気: ${template.overallVibe}\n`)

    // 2. 出力ディレクトリ準備
    const outputDir = args.outputDir || join(process.cwd(), 'output', 'generated')
    await mkdir(outputDir, { recursive: true })

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const baseFilename = `${args.styleId}_${timestamp}`

    // 3. Kling AI で動画生成
    console.log('[2/5] Kling AI で動画生成中...')
    console.log(`  画像URL: ${args.imageUrl}`)

    // プロンプト構築
    const prompt = template.generationParams.klingPromptSuffix
    const negativePrompt = template.generationParams.klingNegativePrompt

    console.log(`  プロンプト: ${prompt.substring(0, 80)}...`)

    // 生成リクエスト
    const taskResponse = await generateImageToVideo({
      imageUrl: args.imageUrl,
      prompt,
      negativePrompt,
      duration: 5,
      aspectRatio: '9:16',
      quality: 'standard',
      modelVersion: '1.6',
    })

    console.log(`  ✓ タスク作成: ${taskResponse.task_id}`)
    console.log('  ✓ 完了まで待機中（約1-3分）...\n')

    // 完了まで待機
    const completedStatus = await waitForCompletion(taskResponse.task_id, {
      maxAttempts: 60,
      pollInterval: 5000,
      onProgress: (status) => {
        if (status.progress !== undefined) {
          process.stdout.write(`\r  進捗: ${status.progress}%`)
        }
      },
    })

    console.log('\n  ✓ 動画生成完了\n')

    // 4. 動画ダウンロード
    console.log('[3/5] 動画ダウンロード中...')
    const rawVideoPath = join(outputDir, `${baseFilename}_raw.mp4`)

    if (!completedStatus.video_url) {
      throw new Error('動画URLが取得できませんでした')
    }

    await downloadVideo(completedStatus.video_url, rawVideoPath)
    console.log(`  ✓ 保存: ${rawVideoPath}\n`)

    let currentVideoPath = rawVideoPath

    // 5. UGC加工
    if (!args.skipUgc) {
      console.log('[4/5] UGC加工適用中...')

      const ffmpegEffects = template.generationParams.ffmpegEffects
      const effects = ffmpegEffects.effects as UGCEffect[]
      const intensity = ffmpegEffects.intensity

      console.log(`  エフェクト: ${effects.join(', ')}`)
      console.log(`  強度: ${intensity}`)

      const ugcVideoPath = join(outputDir, `${baseFilename}_ugc.mp4`)

      await processUGCVideo({
        inputPath: currentVideoPath,
        outputPath: ugcVideoPath,
        effects,
        intensity,
      })

      currentVideoPath = ugcVideoPath
      console.log(`  ✓ UGC加工完了\n`)
    } else {
      console.log('[4/5] UGC加工スキップ\n')
    }

    // 6. テキストオーバーレイ
    if (args.text) {
      console.log('[5/5] テキストオーバーレイ追加中...')
      console.log(`  テキスト: ${args.text}`)

      const finalVideoPath = join(outputDir, `${baseFilename}.mp4`)

      // スタイルテンプレートから字幕スタイルを取得（あれば）
      const subtitleStyle: SubtitleStyle = {
        fontSize: 28,
        fontColor: 'white',
        outlineColor: 'black',
        outlineWidth: 2,
        position: 'bottom',
        marginV: 50,
      }

      await addTextOverlay({
        inputPath: currentVideoPath,
        outputPath: finalVideoPath,
        text: args.text,
        style: subtitleStyle,
      })

      currentVideoPath = finalVideoPath
      console.log(`  ✓ テキスト追加完了\n`)
    } else {
      console.log('[5/5] テキストオーバーレイなし\n')

      // 最終ファイル名にリネーム
      if (currentVideoPath !== join(outputDir, `${baseFilename}.mp4`)) {
        const { rename } = await import('fs/promises')
        const finalVideoPath = join(outputDir, `${baseFilename}.mp4`)
        await rename(currentVideoPath, finalVideoPath)
        currentVideoPath = finalVideoPath
      }
    }

    // 完了
    console.log('====================================')
    console.log('動画生成完了')
    console.log('====================================\n')

    console.log(`出力ファイル: ${currentVideoPath}`)
    console.log(`スタイル: ${template.name}`)
    console.log(`雰囲気: ${template.overallVibe}`)
    console.log(`エフェクト: ${template.generationParams.ffmpegEffects.effects.join(', ')}`)

    // 生成情報をJSONとして保存
    const metadataPath = join(outputDir, `${baseFilename}_metadata.json`)
    await writeFile(
      metadataPath,
      JSON.stringify(
        {
          styleId: args.styleId,
          styleTemplate: template.name,
          imageUrl: args.imageUrl,
          text: args.text || null,
          prompt,
          negativePrompt,
          effects: template.generationParams.ffmpegEffects,
          generatedAt: new Date().toISOString(),
          outputPath: currentVideoPath,
        },
        null,
        2
      )
    )
    console.log(`\nメタデータ: ${metadataPath}`)

  } catch (error) {
    console.error('\nエラーが発生しました:', error)
    process.exit(1)
  }
}

// 実行
main().catch(console.error)
