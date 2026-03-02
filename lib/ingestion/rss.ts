/**
 * RSS feed ingestion for fintech news sources
 * Parses TechCrunch, The Block, Axios Pro Rata RSS feeds
 * Matches articles to companies in the registry
 */

import { createServiceClient } from '@/lib/supabase/server'
import { discoverAndCreateCompany } from '@/lib/ingestion/company-discovery'

const RSS_FEEDS = [
  {
    name: 'TechCrunch Fintech',
    url: 'https://techcrunch.com/tag/fintech/feed/',
  },
  {
    name: 'The Block',
    url: 'https://www.theblock.co/rss.xml',
  },
  {
    name: 'Axios Pro Rata',
    url: 'https://www.axios.com/pro/deals-news.rss',
  },
  {
    name: 'Finextra',
    url: 'https://www.finextra.com/rss/newsfeed.aspx',
  },
  {
    name: 'PYMNTS',
    url: 'https://www.pymnts.com/feed/',
  },
  {
    name: 'Fintech Futures',
    url: 'https://www.fintechfutures.com/feed/',
  },
  {
    name: 'The Financial Brand',
    url: 'https://thefinancialbrand.com/feed/',
  },
  {
    name: 'Crowdfund Insider',
    url: 'https://www.crowdfundinsider.com/feed/',
  },
]

interface RSSItem {
  title: string
  link: string
  pubDate: string
  description: string
  source: string
}

function parseRSSFeed(xml: string, sourceName: string): RSSItem[] {
  const items: RSSItem[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let match

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1]

    const title = extractTag(itemXml, 'title')
    const link = extractTag(itemXml, 'link') || extractAtomLink(itemXml)
    const pubDate = extractTag(itemXml, 'pubDate')
    const description = extractTag(itemXml, 'description')

    if (title && link) {
      items.push({
        title: stripCDATA(title),
        link,
        pubDate: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        description: stripCDATA(description ?? '').replace(/<[^>]+>/g, '').slice(0, 500),
        source: sourceName,
      })
    }
  }

  return items
}

function extractTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`)
  const match = xml.match(regex)
  return match ? match[1].trim() : null
}

function extractAtomLink(xml: string): string | null {
  const match = xml.match(/<link[^>]+href="([^"]+)"/)
  return match ? match[1] : null
}

function stripCDATA(text: string): string {
  return text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim()
}

export async function syncRSSFeeds(): Promise<{ inserted: number; discovered: number; errors: string[] }> {
  const supabase = createServiceClient()
  const errors: string[] = []
  let inserted = 0
  let discovered = 0

  // Load companies for matching
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name')
    .order('name')

  if (!companies?.length) return { inserted, discovered, errors }

  for (const feed of RSS_FEEDS) {
    let xml: string
    try {
      const res = await fetch(feed.url, {
        headers: { 'User-Agent': 'fintech-dealflow/1.0' },
        signal: AbortSignal.timeout(10_000),
      })
      if (!res.ok) {
        errors.push(`RSS fetch failed for ${feed.name}: ${res.status}`)
        continue
      }
      xml = await res.text()
    } catch (err) {
      errors.push(`RSS fetch error for ${feed.name}: ${String(err)}`)
      continue
    }

    const items = parseRSSFeed(xml, feed.name)

    for (const item of items) {
      const text = `${item.title} ${item.description}`.toLowerCase()
      let matched = companies.find((c) => text.includes(c.name.toLowerCase()))

      if (!matched) {
        const newCompany = await discoverAndCreateCompany(item.title, supabase)
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
            title: item.title,
            url: item.link,
            source: item.source,
            published_at: item.pubDate,
            summary: item.description || null,
          },
          { onConflict: 'url', ignoreDuplicates: true }
        )

      if (error) {
        errors.push(`RSS article insert error: ${error.message}`)
      } else {
        inserted++
      }
    }
  }

  return { inserted, discovered, errors }
}
