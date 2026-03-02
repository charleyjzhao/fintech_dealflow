import { NextRequest, NextResponse } from 'next/server'
import { syncNewsFromNewsAPI } from '@/lib/ingestion/newsapi'
import { syncRSSFeeds } from '@/lib/ingestion/rss'
import { syncHackerNewsMentions } from '@/lib/ingestion/hackernews'

export const runtime = 'nodejs'
export const maxDuration = 120

function validateCronSecret(req: NextRequest): boolean {
  const secret = req.headers.get('x-cron-secret')
  return secret === process.env.CRON_SECRET
}

export async function POST(req: NextRequest) {
  if (!validateCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [newsApiResult, rssResult, hnResult] = await Promise.allSettled([
      syncNewsFromNewsAPI(),
      syncRSSFeeds(),
      syncHackerNewsMentions(),
    ])

    return NextResponse.json({
      success: true,
      newsapi: newsApiResult.status === 'fulfilled' ? newsApiResult.value : { error: String(newsApiResult.reason) },
      rss: rssResult.status === 'fulfilled' ? rssResult.value : { error: String(rssResult.reason) },
      hn: hnResult.status === 'fulfilled' ? hnResult.value : { error: String(hnResult.reason) },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('sync-news error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// Vercel Cron: every 2 hours
export async function GET(req: NextRequest) {
  return POST(req)
}
