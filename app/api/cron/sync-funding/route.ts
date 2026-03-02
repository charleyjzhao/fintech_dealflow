import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

function validateCronSecret(req: NextRequest): boolean {
  const secret = req.headers.get('x-cron-secret')
  return secret === process.env.CRON_SECRET
}

// Crunchbase ingestion disabled — requires paid API access
export async function POST(req: NextRequest) {
  if (!validateCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json({ success: false, message: 'Crunchbase ingestion disabled' })
}

export async function GET(req: NextRequest) {
  return POST(req)
}
