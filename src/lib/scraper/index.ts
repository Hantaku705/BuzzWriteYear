/**
 * 商品URLスクレイパー
 * Amazon、楽天、一般サイトから商品情報を抽出
 */

import { detectSiteType } from './detector'
import { fetchWithRetry } from './utils'
import { parseAmazon } from './parsers/amazon'
import { parseRakuten } from './parsers/rakuten'
import { parseGeneric } from './parsers/generic'
import { analyzeWithLLM } from './llm-analyzer'
import type { ScrapeResult, ScrapedProduct } from './types'

export interface ScrapeOptions {
  useLLM?: boolean
}

export async function scrapeProductUrl(
  url: string,
  options: ScrapeOptions = {}
): Promise<ScrapeResult> {
  const { useLLM = true } = options // デフォルトでLLMを使用

  try {
    // URL検証
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      return {
        success: false,
        data: null,
        error: '無効なURLです',
      }
    }

    // HTTPSでない場合の変換
    if (parsedUrl.protocol !== 'https:') {
      parsedUrl.protocol = 'https:'
    }

    const normalizedUrl = parsedUrl.href
    const siteType = detectSiteType(normalizedUrl)

    // HTML取得
    let html: string
    try {
      html = await fetchWithRetry(normalizedUrl)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'

      if (message.includes('429') || message.includes('rate limit')) {
        return {
          success: false,
          data: null,
          error: 'レート制限に達しました。しばらく待ってから再試行してください。',
        }
      }

      if (message.includes('403') || message.includes('blocked')) {
        return {
          success: false,
          data: null,
          error: 'アクセスがブロックされました。',
        }
      }

      return {
        success: false,
        data: null,
        error: `ページの取得に失敗しました: ${message}`,
      }
    }

    // パース
    let product: ScrapedProduct
    try {
      switch (siteType) {
        case 'amazon':
          product = parseAmazon(html, normalizedUrl)
          break
        case 'rakuten':
          product = parseRakuten(html, normalizedUrl)
          break
        default:
          product = parseGeneric(html, normalizedUrl)
      }
    } catch (err) {
      console.error('Parse error:', err)
      return {
        success: false,
        data: null,
        error: '商品情報の解析に失敗しました。',
      }
    }

    // 最低限のデータ検証
    if (!product.name) {
      return {
        success: false,
        data: null,
        error: '商品名を取得できませんでした。',
      }
    }

    // LLMによる解析（オプション）
    if (useLLM) {
      try {
        const analyzed = await analyzeWithLLM(product)
        return {
          success: true,
          data: {
            ...product,
            name: analyzed.name || product.name,
            price: analyzed.price ?? product.price,
            description: analyzed.description || product.description,
            features: analyzed.features.length > 0 ? analyzed.features : product.features,
            category: analyzed.category,
            brand: analyzed.brand,
            targetAudience: analyzed.targetAudience,
          },
        }
      } catch (llmError) {
        console.error('LLM analysis failed, using raw scraped data:', llmError)
        // LLM失敗時はスクレイピング結果をそのまま返す
      }
    }

    return {
      success: true,
      data: product,
    }
  } catch (err) {
    console.error('Scrape error:', err)
    return {
      success: false,
      data: null,
      error: '予期せぬエラーが発生しました。',
    }
  }
}

export type { ScrapedProduct, ScrapeResult, SiteType } from './types'
