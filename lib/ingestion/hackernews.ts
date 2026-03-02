/**
 * Hacker News ingestion via Algolia HN Search API
 * Free, no auth required. Searches for company mentions in HN stories.
 * Stores results in news_articles with source='hackernews'.
 */

import { createServiceClient } from '@/lib/supabase/server'

const HN_SEARCH = 'https://hn.algolia.com/api/v1/search'
const WINDOW_SECONDS = 2 * 3600  // match 2h cron cadence
const HITS_PER_COMPANY = 5
const DELAY_MS = 200

interface HNHit {
  objectID: string
  title: string
  url: string | null
  points: number
  num_comments: number
  created_at: string
}

interface HNSearchResponse {
  hits: HNHit[]
}

async function searchHN(companyName: string, since: number): Promise<HNHit[]> {
  const params = new URLSearchParams({
    query: `"${companyName}"`,
    tags: 'story',
    numericFilters: `created_at_i>${since},points>0`,
    hitsPerPage: String(HITS_PER_COMPANY),
  })

  const res = await fetch(`${HN_SEARCH}?${params}`, {
    headers: { 'User-Agent': 'fintech-dealflow/1.0' },
    signal: AbortSignal.timeout(10_000),
  })

  if (!res.ok) {
    throw new Error(`HN search failed: ${res.status}`)
  }

  const data: HNSearchResponse = await res.json()
  return data.hits ?? []
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function syncHackerNewsMentions(): Promise<{ inserted: number; errors: string[] }> {
  const supabase = createServiceClient()
  const errors: string[] = []
  let inserted = 0

  const { data: companies } = await supabase
    .from('companies')
    .select('id, name')
    .order('name')

  if (!companies?.length) return { inserted, errors }

  const since = Math.floor(Date.now() / 1000) - WINDOW_SECONDS

  for (let i = 0; i < companies.length; i++) {
    const company = companies[i]

    if (i > 0) await sleep(DELAY_MS)

    let hits: HNHit[]
    try {
      hits = await searchHN(company.name, since)
    } catch (err) {
      errors.push(`HN search error for ${company.name}: ${String(err)}`)
      continue
    }

    for (const hit of hits) {
      // Use the linked article URL if present, otherwise link to the HN item
      const url = hit.url ?? `https://news.ycombinator.com/item?id=${hit.objectID}`

      const { error } = await supabase
        .from('news_articles')
        .upsert(
          {
            company_id: company.id,
            title: hit.title,
            url,
            source: 'hackernews',
            published_at: new Date(hit.created_at).toISOString(),
            summary: `${hit.points} points · ${hit.num_comments} comments`,
          },
          { onConflict: 'url', ignoreDuplicates: true }
        )

      if (error) {
        errors.push(`HN article insert error for ${company.name}: ${error.message}`)
      } else {
        inserted++
      }
    }
  }

  return { inserted, errors }
}
