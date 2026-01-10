/**
 * スクレイパーユーティリティ
 */

export const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
  Connection: 'keep-alive',
  'Cache-Control': 'no-cache',
}

export interface FetchOptions {
  timeout?: number
  retries?: number
  retryDelay?: number
}

export async function fetchWithRetry(
  url: string,
  options: FetchOptions = {}
): Promise<string> {
  const { timeout = 15000, retries = 3, retryDelay = 1000 } = options

  let lastError: Error | null = null

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(url, {
        headers: DEFAULT_HEADERS,
        signal: controller.signal,
        redirect: 'follow',
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // レート制限チェック
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After')
        const delay = retryAfter
          ? parseInt(retryAfter) * 1000
          : retryDelay * (attempt + 1)
        await sleep(delay)
        continue
      }

      return await response.text()
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))

      if (attempt < retries - 1) {
        await sleep(retryDelay * (attempt + 1))
      }
    }
  }

  throw lastError || new Error('Fetch failed')
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// 日本円価格パース
export function parseJapanesePrice(text: string): number | null {
  if (!text) return null
  const cleaned = text.replace(/[¥￥,、円税込税抜]/g, '').trim()
  const match = cleaned.match(/\d+/)
  if (!match) return null
  const num = parseInt(match[0])
  return isNaN(num) ? null : num
}

// 相対URLを絶対URLに変換
export function resolveUrl(url: string, baseUrl: string): string {
  try {
    return new URL(url, baseUrl).href
  } catch {
    return url
  }
}
