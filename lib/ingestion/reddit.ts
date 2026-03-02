/**
 * Reddit mention poller via OAuth2 (PRAW-equivalent approach)
 * Searches key subreddits for company name mentions
 *
 * Rate limit: 60 req/min with OAuth
 * Subreddits monitored: r/fintech, r/investing, r/startups, r/personalfinance
 */

import { createServiceClient } from '@/lib/supabase/server'

const REDDIT_BASE = 'https://oauth.reddit.com'
const REDDIT_AUTH_URL = 'https://www.reddit.com/api/v1/access_token'
const MONITORED_SUBREDDITS = ['fintech', 'investing', 'startups', 'personalfinance', 'CryptoCurrency']

let cachedToken: { token: string; expiresAt: number } | null = null

async function getRedditAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token
  }

  const clientId = process.env.REDDIT_CLIENT_ID
  const clientSecret = process.env.REDDIT_CLIENT_SECRET
  const userAgent = process.env.REDDIT_USER_AGENT ?? 'fintech-dealflow/1.0'

  if (!clientId || !clientSecret) throw new Error('Reddit credentials not set')

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const res = await fetch(REDDIT_AUTH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': userAgent,
    },
    body: 'grant_type=client_credentials',
  })

  if (!res.ok) throw new Error(`Reddit auth failed: ${res.status}`)

  const data = await res.json()
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  }

  return cachedToken.token
}

async function searchRedditForCompany(
  companyName: string,
  token: string,
  userAgent: string
): Promise<{ count: number; engagementScore: number }> {
  const subredditStr = MONITORED_SUBREDDITS.join('+')
  const url = new URL(`${REDDIT_BASE}/r/${subredditStr}/search`)
  url.searchParams.set('q', companyName)
  url.searchParams.set('sort', 'new')
  url.searchParams.set('limit', '25')
  url.searchParams.set('restrict_sr', 'true')

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': userAgent,
    },
    signal: AbortSignal.timeout(10_000),
  })

  if (res.status === 429) return { count: 0, engagementScore: 0 }
  if (!res.ok) throw new Error(`Reddit search failed: ${res.status}`)

  const data = await res.json()
  const allPosts = data.data?.children ?? []

  // Filter to posts from the last hour to match the hourly cron cadence.
  // Note: Reddit's `t` param is ignored when sort=new, so we filter client-side.
  const oneHourAgo = Math.floor(Date.now() / 1000) - 3_600
  const posts = allPosts.filter(
    (p: { data?: { created_utc?: number } }) => (p.data?.created_utc ?? 0) > oneHourAgo
  )

  let engagementScore = 0
  for (const post of posts) {
    const d = post.data ?? {}
    engagementScore += (d.score ?? 0) + (d.num_comments ?? 0) * 2
  }

  return {
    count: posts.length,
    engagementScore: Math.round(engagementScore),
  }
}

export async function syncRedditMentions(): Promise<{ processed: number; errors: string[] }> {
  const userAgent = process.env.REDDIT_USER_AGENT ?? 'fintech-dealflow/1.0'
  const supabase = createServiceClient()
  const errors: string[] = []
  let processed = 0

  const { data: companies } = await supabase
    .from('companies')
    .select('id, name')
    .order('name')

  if (!companies?.length) return { processed, errors }

  let token: string
  try {
    token = await getRedditAccessToken()
  } catch (err) {
    return { processed: 0, errors: [`Reddit auth failed: ${String(err)}`] }
  }

  const sampledAt = new Date().toISOString()

  for (const company of companies) {
    try {
      const { count, engagementScore } = await searchRedditForCompany(
        company.name,
        token,
        userAgent
      )

      if (count > 0) {
        const { error } = await supabase.from('social_signals').insert({
          company_id: company.id,
          platform: 'reddit',
          mention_count: count,
          engagement_score: engagementScore,
          sampled_at: sampledAt,
        })

        if (error) errors.push(`Reddit signal insert error for ${company.name}: ${error.message}`)
      }

      processed++
    } catch (err) {
      errors.push(`Reddit error for ${company.name}: ${String(err)}`)
    }

    // Respect 60 req/min rate limit
    await new Promise((r) => setTimeout(r, 1_100))
  }

  return { processed, errors }
}
