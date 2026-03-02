/**
 * X (Twitter) API v2 mention poller
 * Uses Bearer Token auth (app-only)
 *
 * Quota: Basic tier = 10,000 tweets/month
 * Strategy: batch 10 companies per OR query, max_results=30, enforced 12h cooldown
 * Budget: 5 batches × 30 tweets × 60 runs/month = 9,000 tweets/month
 *
 * Docs: https://developer.twitter.com/en/docs/twitter-api/tweets/search/api-reference/get-tweets-search-recent
 */

import { createServiceClient } from '@/lib/supabase/server'

const X_API_BASE = 'https://api.twitter.com/2'
const BATCH_SIZE = 10
const MAX_RESULTS = 30
const WINDOW_HOURS = 12

interface XTweet {
  id: string
  text: string
  public_metrics?: {
    like_count: number
    reply_count: number
    retweet_count: number
    quote_count: number
  }
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function searchXBatch(query: string, bearerToken: string): Promise<XTweet[]> {
  const url = new URL(`${X_API_BASE}/tweets/search/recent`)
  url.searchParams.set('query', query)
  url.searchParams.set('max_results', String(MAX_RESULTS))
  url.searchParams.set('tweet.fields', 'public_metrics,created_at')
  url.searchParams.set('start_time', new Date(Date.now() - WINDOW_HOURS * 3_600_000).toISOString())

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${bearerToken}` },
    signal: AbortSignal.timeout(15_000),
  })

  if (res.status === 429) return [] // Rate limited — skip silently
  if (!res.ok) throw new Error(`X API search failed: ${res.status}`)

  const data = await res.json()
  return data.data ?? []
}

function tweetEngagement(tweet: XTweet): number {
  const m = tweet.public_metrics ?? {}
  return (
    (m.like_count ?? 0) +
    (m.reply_count ?? 0) * 1.5 +
    (m.retweet_count ?? 0) * 2 +
    (m.quote_count ?? 0) * 1.5
  )
}

export async function syncXMentions(): Promise<{ processed: number; skipped?: boolean; errors: string[] }> {
  const bearerToken = process.env.X_BEARER_TOKEN
  if (!bearerToken) throw new Error('X_BEARER_TOKEN not set')

  const supabase = createServiceClient()
  const errors: string[] = []

  // Guard: skip if X was synced within the last 12 hours
  const { data: latest } = await supabase
    .from('social_signals')
    .select('sampled_at')
    .eq('platform', 'x')
    .order('sampled_at', { ascending: false })
    .limit(1)
    .single()

  if (latest) {
    const hoursSinceLast = (Date.now() - new Date(latest.sampled_at).getTime()) / 3_600_000
    if (hoursSinceLast < WINDOW_HOURS) {
      return { processed: 0, skipped: true, errors: [] }
    }
  }

  const { data: companies } = await supabase
    .from('companies')
    .select('id, name')
    .order('name')

  if (!companies?.length) return { processed: 0, errors }

  const sampledAt = new Date().toISOString()
  let processed = 0

  for (let i = 0; i < companies.length; i += BATCH_SIZE) {
    const batch = companies.slice(i, i + BATCH_SIZE)

    try {
      const orQuery = `(${batch.map((c) => `"${c.name}"`).join(' OR ')}) -is:retweet lang:en`
      const tweets = await searchXBatch(orQuery, bearerToken)

      // Tally mentions + engagement per company from the batch's tweets
      const signals: Record<string, { count: number; engagement: number }> = {}
      for (const company of batch) {
        signals[company.id] = { count: 0, engagement: 0 }
      }

      for (const tweet of tweets) {
        const text = tweet.text.toLowerCase()
        const eng = tweetEngagement(tweet)
        for (const company of batch) {
          if (text.includes(company.name.toLowerCase())) {
            signals[company.id].count++
            signals[company.id].engagement += eng
          }
        }
      }

      // Insert a signal row for each company with at least one mention
      for (const company of batch) {
        const { count, engagement } = signals[company.id]
        if (count > 0) {
          const { error } = await supabase.from('social_signals').insert({
            company_id: company.id,
            platform: 'x',
            mention_count: count,
            engagement_score: Math.round(engagement),
            sampled_at: sampledAt,
          })
          if (error) errors.push(`X insert error for ${company.name}: ${error.message}`)
        }
        processed++
      }
    } catch (err) {
      errors.push(`X batch error (companies ${i}–${i + BATCH_SIZE - 1}): ${String(err)}`)
    }

    await sleep(1_000) // 1s between batch requests
  }

  return { processed, errors }
}
