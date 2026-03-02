import { NextRequest, NextResponse } from 'next/server'
import { syncFundingRounds } from '@/lib/ingestion/crunchbase'

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
    const { searchParams } = new URL(req.url)
    const daysBack = parseInt(searchParams.get('days') ?? '7')

    const result = await syncFundingRounds(daysBack)

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('sync-funding error:', err)
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    )
  }
}

// Vercel Cron: every 6 hours
// vercel.json: { "crons": [{ "path": "/api/cron/sync-funding", "schedule": "0 */6 * * *" }] }
export async function GET(req: NextRequest) {
  return POST(req)
}
