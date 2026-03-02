/**
 * NewsAPI.org ingestion
 * Pulls fintech news articles and matches them to companies in the registry
 *
 * Free tier: 100 req/day, no older than 1 month
 * Docs: https://newsapi.org/docs
 */

import { createServiceClient } from '@/lib/supabase/server'
import { discoverAndCreateCompany } from '@/lib/ingestion/company-discovery'

const NEWSAPI_BASE = 'https://newsapi.org/v2'

interface NewsAPIArticle {
  title: string
  description: string | null
  url: string
  source: { id: string | null; name: string }
  publishedAt: string
}

interface NewsAPIResponse {
  status: string
  totalResults: number
  articles: NewsAPIArticle[]
}

export async function syncNewsFromNewsAPI(): Promise<{ inserted: number; discovered: number; errors: string[] }> {
  const apiKey = process.env.NEWSAPI_KEY
  if (!apiKey) throw new Error('NEWSAPI_KEY not set')

  const supabase = createServiceClient()
  const errors: string[] = []
  let inserted = 0
  let discovered = 0

  // Fetch companies for name matching
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name')
    .order('name')

  if (!companies?.length) return { inserted, discovered, errors }

  // Search fintech news
  const queries = ['fintech funding', 'fintech startup', 'payments startup', 'neobank']

  for (const query of queries) {
    const url = new URL(`${NEWSAPI_BASE}/everything`)
    url.searchParams.set('q', query)
    url.searchParams.set('language', 'en')
    url.searchParams.set('sortBy', 'publishedAt')
    url.searchParams.set('pageSize', '20')
    url.searchParams.set('apiKey', apiKey)

    const res = await fetch(url.toString())
    if (!res.ok) {
      errors.push(`NewsAPI request failed for "${query}": ${res.status}`)
      continue
    }

    const data: NewsAPIResponse = await res.json()
    if (data.status !== 'ok') {
      errors.push(`NewsAPI error for "${query}": ${data.status}`)
      continue
    }

    for (const article of data.articles) {
      if (!article.title || !article.url) continue
      if (article.title === '[Removed]' || article.url === 'https://removed.com') continue

      // Match article to company by name occurrence in title or description
      const text = `${article.title} ${article.description ?? ''}`.toLowerCase()
      let matched = companies.find((c) =>
        text.includes(c.name.toLowerCase())
      )

      if (!matched) {
        const newCompany = await discoverAndCreateCompany(article.title, supabase)
        if (!newCompany) continue
        companies.push(newCompany)
        matched = newCompany
        discovered++
      }

      const { error } = await supabase
        .from('news_articles')
        .upsert(
          {
            company_id: matched.id,
            title: article.title,
            url: article.url,
            source: article.source.name,
            published_at: article.publishedAt,
            summary: article.description,
          },
          { onConflict: 'url', ignoreDuplicates: true }
        )

      if (error) {
        errors.push(`Article insert error: ${error.message}`)
      } else {
        inserted++
      }
    }
  }

  return { inserted, discovered, errors }
}
