import { NextRequest, NextResponse } from 'next/server'
import { computeBuzzScores } from '@/lib/scoring/buzz'

export const runtime = 'nodejs'
export const maxDuration = 60

function validateCronSecret(req: NextRequest): boolean {
  const secret = req.headers.get('x-cron-secret')
  return secret === process.env.CRON_SECRET
}

export async function POST(req: NextRequest) {
  if (!validateCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await computeBuzzScores()

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('compute-buzz error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// Vercel Cron: every hour (after sync-social)
export async function GET(req: NextRequest) {
  return POST(req)
}
