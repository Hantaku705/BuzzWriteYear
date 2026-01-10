/**
 * 楽天市場パーサー
 */

import * as cheerio from 'cheerio'
import type { ScrapedProduct } from '../types'
import { parseJapanesePrice, resolveUrl } from '../utils'

export function parseRakuten(html: string, url: string): ScrapedProduct {
  const $ = cheerio.load(html)

  // 商品名
  const name =
    $('h1.item-name').text().trim() ||
    $('.item_name').text().trim() ||
    $('[itemprop="name"]').first().text().trim() ||
    $('title').text().split('|')[0].trim() ||
    $('h1').first().text().trim()

  // 価格
  const priceText =
    $('.price2').text().trim() ||
    $('.price').first().text().trim() ||
    $('[itemprop="price"]').attr('content') ||
    $('.important').text().trim() ||
    $('.item_price').text().trim()

  const price = parseJapanesePrice(priceText)

  // 説明文
  const description =
    $('.item_desc').text().trim() ||
    $('[itemprop="description"]').text().trim() ||
    $('#item_description').text().trim() ||
    $('meta[name="description"]').attr('content') ||
    ''

  // 画像URL
  const images: string[] = []

  // メイン画像
  const mainImage =
    $('#rakutenLimitedId_ImageMain1-1').attr('src') ||
    $('.image_main img').first().attr('src') ||
    $('[itemprop="image"]').attr('content') ||
    $('.item-image img').first().attr('src')
  if (mainImage) {
    images.push(normalizeRakutenImageUrl(resolveUrl(mainImage, url)))
  }

  // サムネイル画像
  $('.image_sub img, .rakuten-image-sub img, .item-image-sub img').each(
    (_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src')
      if (src && images.length < 6) {
        const normalized = normalizeRakutenImageUrl(resolveUrl(src, url))
        if (!images.includes(normalized)) {
          images.push(normalized)
        }
      }
    }
  )

  // 特徴
  const features: string[] = []

  // 商品スペック
  $('.item_info tr, .item-spec tr').each((_, el) => {
    const th = $(el).find('th').text().trim()
    const td = $(el).find('td').text().trim()
    if (th && td && features.length < 10) {
      features.push(`${th}: ${td}`)
    }
  })

  // ポイント情報
  const pointInfo = $('.point_info, .item-point').text().trim()
  if (pointInfo && features.length < 10) {
    const pointMatch = pointInfo.match(/\d+.*ポイント/)
    if (pointMatch) {
      features.push(`ポイント: ${pointMatch[0]}`)
    }
  }

  // レビュー情報
  const ratingText = $('[itemprop="ratingValue"]').attr('content') || ''
  const rating = parseFloat(ratingText) || null

  const reviewCountText = $('[itemprop="reviewCount"]').attr('content') || ''
  const reviewCount = parseInt(reviewCountText) || null

  return {
    name,
    price,
    description: description.slice(0, 1000).trim(),
    images,
    features: features.slice(0, 10),
    sourceUrl: url,
    siteType: 'rakuten',
    currency: 'JPY',
    rating,
    reviewCount,
  }
}

function normalizeRakutenImageUrl(url: string): string {
  // 楽天の画像URLを大きいサイズに変換
  if (url.includes('?_ex=')) {
    return url.replace(/\?_ex=\d+x\d+/, '?_ex=500x500')
  }
  return url
}
