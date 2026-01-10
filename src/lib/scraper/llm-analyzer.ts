/**
 * LLMによる商品情報解析
 * スクレイピング結果をLLMで解析して構造化された商品情報を抽出
 */

import type { ScrapedProduct } from './types'

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent'

interface AnalyzedProduct {
  name: string
  price: number | null
  description: string | null
  features: string[]
  category?: string
  brand?: string
  targetAudience?: string
}

export async function analyzeWithLLM(
  scraped: ScrapedProduct,
  html?: string
): Promise<AnalyzedProduct> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.warn('GEMINI_API_KEY not set, returning scraped data as-is')
    return {
      name: scraped.name,
      price: scraped.price,
      description: scraped.description,
      features: scraped.features,
    }
  }

  const prompt = buildPrompt(scraped)

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1024,
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gemini API error:', errorText)
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!text) {
      throw new Error('No response from Gemini')
    }

    // JSONを抽出
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Could not parse JSON from response')
    }

    const analyzed = JSON.parse(jsonMatch[0]) as AnalyzedProduct

    return {
      name: analyzed.name || scraped.name,
      price: analyzed.price ?? scraped.price,
      description: analyzed.description || scraped.description,
      features: analyzed.features?.length > 0 ? analyzed.features : scraped.features,
      category: analyzed.category,
      brand: analyzed.brand,
      targetAudience: analyzed.targetAudience,
    }
  } catch (error) {
    console.error('LLM analysis error:', error)
    // エラー時はスクレイピング結果をそのまま返す
    return {
      name: scraped.name,
      price: scraped.price,
      description: scraped.description,
      features: scraped.features,
    }
  }
}

function buildPrompt(scraped: ScrapedProduct): string {
  return `あなたは商品情報を分析するアシスタントです。
以下のスクレイピング結果から、商品情報を抽出してJSON形式で返してください。

## スクレイピング結果
- URL: ${scraped.sourceUrl}
- サイト種別: ${scraped.siteType}
- 取得した名前: ${scraped.name}
- 取得した価格: ${scraped.price ?? '不明'}
- 取得した説明: ${scraped.description?.slice(0, 500) || '不明'}
- 取得した画像数: ${scraped.images.length}枚

## タスク
上記の情報から、以下のJSON形式で商品情報を抽出してください：

\`\`\`json
{
  "name": "商品名（ブランド名を含めた正式名称、50文字以内）",
  "price": 価格（数値、不明な場合はnull）,
  "description": "商品の説明（100文字程度で簡潔に）",
  "features": ["特徴1", "特徴2", "特徴3"],
  "category": "商品カテゴリ（例: スキンケア、サプリメント、家電など）",
  "brand": "ブランド名",
  "targetAudience": "ターゲット層（例: 30代女性、美容に関心のある方）"
}
\`\`\`

重要：
- 商品名は具体的な製品名を推測してください（トップページの場合はブランドの代表商品名）
- featuresは商品のUSP（独自の強み）を3〜5個抽出してください
- 価格が不明な場合はnullとしてください
- JSONのみを返してください（説明文は不要）`
}
