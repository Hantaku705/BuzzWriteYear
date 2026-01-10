/**
 * 商品URLスクレイピングフック
 */

import { useState } from 'react'
import type { ScrapedProduct } from '@/lib/scraper/types'

interface UseScrapeResult {
  scrape: (url: string) => Promise<ScrapedProduct | null>
  isLoading: boolean
  error: string | null
  reset: () => void
}

export function useScrape(): UseScrapeResult {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const scrape = async (url: string): Promise<ScrapedProduct | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'スクレイピングに失敗しました')
        return null
      }

      return data.data
    } catch {
      setError('ネットワークエラーが発生しました')
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const reset = () => {
    setError(null)
    setIsLoading(false)
  }

  return { scrape, isLoading, error, reset }
}
