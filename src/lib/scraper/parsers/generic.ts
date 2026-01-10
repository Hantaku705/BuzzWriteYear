/**
 * 一般サイトパーサー
 * OGP、JSON-LD、汎用セレクターから商品情報を抽出
 */

import * as cheerio from 'cheerio'
import type { ScrapedProduct } from '../types'
import { resolveUrl } from '../utils'

export function parseGeneric(html: string, url: string): ScrapedProduct {
  const $ = cheerio.load(html)

  // JSON-LD（構造化データ）からの抽出を優先
  const jsonLdProduct = extractJsonLdProduct($)
  if (jsonLdProduct && jsonLdProduct.name) {
    return {
      name: jsonLdProduct.name,
      price: jsonLdProduct.price,
      description: jsonLdProduct.description?.slice(0, 1000) || null,
      images: jsonLdProduct.images.map((img) => resolveUrl(img, url)),
      features: [],
      sourceUrl: url,
      siteType: 'generic',
      currency: jsonLdProduct.currency || 'JPY',
    }
  }

  // OGPメタタグからの抽出
  const ogData = extractOgData($)

  // 商品名
  const name =
    ogData.title ||
    $('[itemprop="name"]').first().text().trim() ||
    $('h1').first().text().trim() ||
    $('title').text().trim()

  // 価格
  const priceText =
    $('[itemprop="price"]').attr('content') ||
    $('[itemprop="price"]').text().trim() ||
    $('.price, .product-price, .sale-price').first().text().trim()
  const price = parsePrice(priceText)

  // 説明
  const description =
    ogData.description ||
    $('[itemprop="description"]').text().trim() ||
    $('meta[name="description"]').attr('content') ||
    ''

  // 画像
  const images: string[] = []
  if (ogData.image) {
    images.push(resolveUrl(ogData.image, url))
  }

  $('[itemprop="image"], .product-image img, .main-image img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('content')
    if (src && images.length < 6) {
      const resolved = resolveUrl(src, url)
      if (!images.includes(resolved)) {
        images.push(resolved)
      }
    }
  })

  // 追加の画像取得
  if (images.length < 6) {
    $('img[src*="product"], img[src*="item"], img[alt*="商品"]').each(
      (_, el) => {
        const src = $(el).attr('src')
        if (src && images.length < 6) {
          const resolved = resolveUrl(src, url)
          if (!images.includes(resolved)) {
            images.push(resolved)
          }
        }
      }
    )
  }

  // 特徴
  const features: string[] = []
  $('[itemprop="feature"], .product-feature, .feature-list li').each((_, el) => {
    const text = $(el).text().trim()
    if (text && text.length < 200 && features.length < 10) {
      features.push(text)
    }
  })

  return {
    name,
    price,
    description: description.slice(0, 1000).trim() || null,
    images,
    features,
    sourceUrl: url,
    siteType: 'generic',
  }
}

interface JsonLdProduct {
  name: string
  price: number | null
  description: string | null
  images: string[]
  currency?: string
}

function extractJsonLdProduct(
  $: cheerio.CheerioAPI
): JsonLdProduct | null {
  const scripts = $('script[type="application/ld+json"]')

  for (let i = 0; i < scripts.length; i++) {
    try {
      const content = $(scripts[i]).html()
      if (!content) continue

      const data = JSON.parse(content)
      const product = findProductInJsonLd(data)

      if (product) {
        return {
          name: String(product.name || ''),
          price: parsePrice(product.offers?.price || product.price),
          description: String(product.description || ''),
          images: extractImages(product.image),
          currency: String(product.offers?.priceCurrency || 'JPY'),
        }
      }
    } catch {
      // JSON解析エラーは無視
    }
  }

  return null
}

interface JsonLdProductData {
  name?: string
  price?: unknown
  description?: string
  image?: unknown
  offers?: {
    price?: unknown
    priceCurrency?: string
  }
}

function findProductInJsonLd(
  data: unknown
): JsonLdProductData | null {
  if (!data || typeof data !== 'object') return null

  const obj = data as Record<string, unknown>

  if (obj['@type'] === 'Product') {
    return obj as JsonLdProductData
  }

  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findProductInJsonLd(item)
      if (found) return found
    }
  }

  if (obj['@graph'] && Array.isArray(obj['@graph'])) {
    return findProductInJsonLd(obj['@graph'])
  }

  return null
}

function extractOgData($: cheerio.CheerioAPI) {
  return {
    title: $('meta[property="og:title"]').attr('content'),
    description: $('meta[property="og:description"]').attr('content'),
    image: $('meta[property="og:image"]').attr('content'),
  }
}

function extractImages(image: unknown): string[] {
  if (!image) return []
  if (typeof image === 'string') return [image]
  if (Array.isArray(image)) {
    return image
      .map((img) =>
        typeof img === 'string' ? img : (img as { url?: string }).url
      )
      .filter(Boolean) as string[]
  }
  return []
}

function parsePrice(text: unknown): number | null {
  if (typeof text === 'number') return text
  if (typeof text !== 'string') return null
  const cleaned = text.replace(/[^0-9.]/g, '')
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : Math.floor(num)
}
