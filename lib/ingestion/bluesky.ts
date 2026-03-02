/**
 * Bluesky mention poller
 *
 * The public.api.bsky.app endpoint now requires authentication for searchPosts.
 * We authenticate via AT Protocol session (app password) then search via bsky.social.
 * If no credentials are set the job is skipped gracefully.
 *
 * Setup:
 *   1. Create a Bluesky account at bsky.app
 *   2. Go to Settings → Privacy and security → App Passwords → Add App Password
 *   3. Set BLUESKY_IDENTIFIER (your handle, e.g. yourname.bsky.social) and BLUESKY_APP_PASSWORD
 */

import { createServiceClient } from '@/lib/supabase/server'

const BSKY_API = 'https://bsky.social/xrpc'

interface BskyPost {
  uri: string
  author?: {
    handle?: string
    displayName?: string
  }
  record: {
    text: string
    createdAt: string
  }
  likeCount?: number
  replyCount?: number
  repostCount?: number
}

// Module-level token cache (valid for one Lambda/Edge invocation; refreshed when expired)
let _accessJwt: string | null = null
let _tokenExpiry = 0

async function getAuthToken(): Promise<string | null> {
  const identifier = process.env.BLUESKY_IDENTIFIER
  const appPassword = process.env.BLUESKY_APP_PASSWORD

  if (!identifier || !appPassword) return null

  // Reuse cached token if still valid (tokens last ~2h; we refresh after 90 min)
  if (_accessJwt && Date.now() < _tokenExpiry) return _accessJwt

  const res = await fetch(`${BSKY_API}/com.atproto.server.createSession`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password: appPassword }),
    signal: AbortSignal.timeout(10_000),
  })

  if (!res.ok) {
    console.error(`Bluesky auth failed: ${res.status}`)
    return null
  }

  const data = await res.json()
  _accessJwt = data.accessJwt ?? null
  _tokenExpiry = Date.now() + 90 * 60 * 1000
  return _accessJwt
}

async function searchBlueSkyPosts(
  query: string,
  token: string
): Promise<{ count: number; engagementScore: number; posts: BskyPost[] }> {
  const url = new URL(`${BSKY_API}/app.bsky.feed.searchPosts`)
  url.searchParams.set('q', query)
  url.searchParams.set('limit', '25')
  url.searchParams.set('sort', 'latest')

  // Only last hour
  const since = new Date(Date.now() - 3600_000).toISOString()
  url.searchParams.set('since', since)

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(10_000),
  })

  if (!res.ok) {
    if (res.status === 429) return { count: 0, engagementScore: 0, posts: [] }
    throw new Error(`Bluesky search failed: ${res.status}`)
  }

  const data = await res.json()
  const posts: BskyPost[] = data.posts ?? []

  let engagementScore = 0
  for (const post of posts) {
    engagementScore +=
      (post.likeCount ?? 0) +
      (post.replyCount ?? 0) * 1.5 +
      (post.repostCount ?? 0) * 2
  }

  return {
    count: posts.length,
    engagementScore: Math.round(engagementScore),
    posts,
  }
}

export async function syncBlueskyMentions(): Promise<{ processed: number; errors: string[]; skipped?: boolean }> {
  const token = await getAuthToken()

  if (!token) {
    return {
      processed: 0,
      errors: [],
      skipped: true,
    }
  }

  const supabase = createServiceClient()
  const errors: string[] = []
  let processed = 0

  const { data: companies } = await supabase
    .from('companies')
    .select('id, name')
    .order('name')

  if (!companies?.length) return { processed, errors }

  const sampledAt = new Date().toISOString()

  for (const company of companies) {
    try {
      const { count, engagementScore, posts } = await searchBlueSkyPosts(company.name, token)

      if (count > 0) {
        const { error } = await supabase.from('social_signals').insert({
          company_id: company.id,
          platform: 'bluesky',
          mention_count: count,
          engagement_score: engagementScore,
          sampled_at: sampledAt,
        })

        if (error) errors.push(`Bluesky signal insert error for ${company.name}: ${error.message}`)

        for (const post of posts) {
          const { error: postError } = await supabase.from('bluesky_posts').upsert({
            company_id: company.id,
            post_uri: post.uri,
            post_text: post.record.text,
            author_handle: post.author?.handle ?? null,
            author_name: post.author?.displayName ?? null,
            like_count: post.likeCount ?? 0,
            reply_count: post.replyCount ?? 0,
            repost_count: post.repostCount ?? 0,
            posted_at: post.record.createdAt,
          }, { onConflict: 'post_uri', ignoreDuplicates: false })

          if (postError) errors.push(`Bluesky post upsert error for ${company.name}: ${postError.message}`)
        }
      }

      processed++
    } catch (err) {
      errors.push(`Bluesky error for ${company.name}: ${String(err)}`)
    }

    // Polite delay to stay within rate limits
    await new Promise((r) => setTimeout(r, 300))
  }

  return { processed, errors }
}
