/**
 * Amazonパーサー
 */

import * as cheerio from 'cheerio'
import type { ScrapedProduct } from '../types'
import { parseJapanesePrice } from '../utils'

export function parseAmazon(html: string, url: string): ScrapedProduct {
  const $ = cheerio.load(html)

  // 商品名
  const name =
    $('#productTitle').text().trim() ||
    $('#title').text().trim() ||
    $('h1.a-size-large').first().text().trim() ||
    $('h1').first().text().trim()

  // 価格（複数パターン対応）
  const priceText =
    $('.a-price .a-offscreen').first().text().trim() ||
    $('#priceblock_ourprice').text().trim() ||
    $('#priceblock_dealprice').text().trim() ||
    $('.a-price-whole').first().text().trim() ||
    $('#corePrice_feature_div .a-offscreen').first().text().trim() ||
    $('.priceToPay .a-offscreen').first().text().trim()

  const price = parseJapanesePrice(priceText)

  // 元値（セール時）
  const originalPriceText =
    $('.a-text-price .a-offscreen').first().text().trim() ||
    $('.a-price.a-text-price .a-offscreen').first().text().trim()
  const originalPrice = parseJapanesePrice(originalPriceText)

  // 説明文
  const description =
    $('#feature-bullets ul').text().trim() ||
    $('#productDescription').text().trim() ||
    $('meta[name="description"]').attr('content') ||
    ''

  // 画像URL（メイン画像 + サムネイル）
  const images: string[] = []

  // メイン画像
  const mainImage =
    $('#imgTagWrapperId img').attr('data-old-hires') ||
    $('#imgTagWrapperId img').attr('src') ||
    $('#landingImage').attr('data-old-hires') ||
    $('#landingImage').attr('src')
  if (mainImage) {
    images.push(normalizeAmazonImageUrl(mainImage))
  }

  // サムネイル画像群
  $('#altImages img').each((_, el) => {
    const src = $(el).attr('src')
    if (src && !src.includes('play-button') && images.length < 6) {
      const normalized = normalizeAmazonImageUrl(src)
      if (!images.includes(normalized)) {
        images.push(normalized)
      }
    }
  })

  // 特徴（箇条書き）
  const features: string[] = []
  $('#feature-bullets li span.a-list-item').each((_, el) => {
    const text = $(el).text().trim()
    if (text && text.length < 200 && text.length > 5) {
      features.push(text)
    }
  })

  // A+コンテンツからも特徴抽出
  if (features.length < 5) {
    $('#aplus h3, #aplus h4').each((_, el) => {
      const text = $(el).text().trim()
      if (text && text.length < 100 && features.length < 10) {
        features.push(text)
      }
    })
  }

  // レビュー情報
  const ratingText = $('#acrPopover').attr('title') || ''
  const rating = parseFloat(ratingText) || null

  const reviewCountText = $('#acrCustomerReviewText').text().trim()
  const reviewCount = parseInt(reviewCountText.replace(/[^0-9]/g, '')) || null

  return {
    name,
    price,
    description: description.slice(0, 1000).trim(),
    images,
    features: features.slice(0, 10),
    sourceUrl: url,
    siteType: 'amazon',
    currency: 'JPY',
    originalPrice,
    rating,
    reviewCount,
  }
}

function normalizeAmazonImageUrl(url: string): string {
  // 小さいサムネイルを大きい画像に変換
  return url
    .replace(/_S[XYL]\d+_?/g, '_SL1500_')
    .replace(/_AC_US\d+_/g, '_AC_SL1500_')
    .replace(/_AC_S[XYL]\d+_/g, '_AC_SL1500_')
}
