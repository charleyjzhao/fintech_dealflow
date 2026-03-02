import { NextRequest, NextResponse } from 'next/server'
import { syncXMentions } from '@/lib/ingestion/x-api'
import { syncRedditMentions } from '@/lib/ingestion/reddit'
import { syncBlueskyMentions } from '@/lib/ingestion/bluesky'

export const runtime = 'nodejs'
export const maxDuration = 300

function validateCronSecret(req: NextRequest): boolean {
  const secret = req.headers.get('x-cron-secret')
  return secret === process.env.CRON_SECRET
}

export async function POST(req: NextRequest) {
  if (!validateCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Run sequentially to avoid overwhelming rate limits
    const xResult = await syncXMentions().catch((e) => ({ processed: 0, errors: [String(e)] }))
    const redditResult = await syncRedditMentions().catch((e) => ({ processed: 0, errors: [String(e)] }))
    const bskyResult = await syncBlueskyMentions().catch((e) => ({ processed: 0, errors: [String(e)] }))

    return NextResponse.json({
      success: true,
      x: xResult,
      reddit: redditResult,
      bluesky: bskyResult,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('sync-social error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// Vercel Cron: every hour
export async function GET(req: NextRequest) {
  return POST(req)
}
