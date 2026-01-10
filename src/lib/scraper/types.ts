/**
 * スクレイパー型定義
 */

export type SiteType = 'amazon' | 'rakuten' | 'generic'

export interface ScrapedProduct {
  name: string
  price: number | null
  description: string | null
  images: string[]
  features: string[]
  sourceUrl: string
  siteType: SiteType
  currency?: string
  originalPrice?: number | null
  rating?: number | null
  reviewCount?: number | null
  // LLM分析フィールド
  category?: string
  brand?: string
  targetAudience?: string
}

export interface ScrapeResult {
  success: boolean
  data: ScrapedProduct | null
  error?: string
}

export interface ParserConfig {
  userAgent: string
  timeout: number
  retryCount: number
}
