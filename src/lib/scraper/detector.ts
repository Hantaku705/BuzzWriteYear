/**
 * サイト種別検出
 */

import type { SiteType } from './types'

export function detectSiteType(url: string): SiteType {
  const hostname = new URL(url).hostname.toLowerCase()

  // Amazon判定（amazon.co.jp, amazon.com, amzn.to等）
  if (hostname.includes('amazon.') || hostname.includes('amzn.')) {
    return 'amazon'
  }

  // 楽天判定（item.rakuten.co.jp, rakuten.co.jp等）
  if (hostname.includes('rakuten.co.jp')) {
    return 'rakuten'
  }

  return 'generic'
}
