/**
 * Buzz score computation
 *
 * score_24h = (x_mentions * 1.5) + (reddit_mentions * 1.2) + (bluesky_mentions * 1.0) + (news_articles * 2.0)
 *             + engagement bonus: (x_engagement * 0.1) + (reddit_engagement * 0.08) + (bluesky_engagement * 0.05)
 *
 * score_7d  = 7-day rolling sum with exponential decay (recent days weighted more)
 *             decay factor: 0.85 per day (day 1 = 1.0, day 2 = 0.85, ..., day 7 = 0.85^6 ≈ 0.38)
 */

import { createServiceClient } from '@/lib/supabase/server'

const PLATFORM_WEIGHTS: Record<string, number> = {
  x: 1.5,
  reddit: 1.2,
  bluesky: 1.0,
  news: 2.0,
}

const ENGAGEMENT_WEIGHTS: Record<string, number> = {
  x: 0.1,
  reddit: 0.08,
  bluesky: 0.05,
  news: 0.0,
}

const DECAY_FACTOR = 0.85

function daysBetween(date1: Date, date2: Date): number {
  return Math.floor((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24))
}

function decayWeight(daysAgo: number): number {
  return Math.pow(DECAY_FACTOR, daysAgo)
}

export async function computeBuzzScores(): Promise<{ updated: number; errors: string[] }> {
  const supabase = createServiceClient()
  const errors: string[] = []
  let updated = 0

  const now = new Date()
  const cutoff24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const cutoff7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // Fetch all companies
  const { data: companies, error: companiesErr } = await supabase
    .from('companies')
    .select('id')

  if (companiesErr) return { updated: 0, errors: [companiesErr.message] }
  if (!companies?.length) return { updated: 0, errors: [] }

  // Fetch all social signals in 7-day window
  const { data: signals, error: signalsErr } = await supabase
    .from('social_signals')
    .select('company_id, platform, mention_count, engagement_score, sampled_at')
    .gte('sampled_at', cutoff7d.toISOString())
    .order('sampled_at', { ascending: false })

  if (signalsErr) return { updated: 0, errors: [signalsErr.message] }

  // Fetch news article counts per company in 7-day window
  const { data: newsData, error: newsErr } = await supabase
    .from('news_articles')
    .select('company_id, published_at')
    .gte('published_at', cutoff7d.toISOString())

  if (newsErr) return { updated: 0, errors: [newsErr.message] }

  // Group signals and news by company
  const signalsByCompany: Record<string, typeof signals> = {}
  for (const signal of signals ?? []) {
    if (!signalsByCompany[signal.company_id]) signalsByCompany[signal.company_id] = []
    signalsByCompany[signal.company_id].push(signal)
  }

  const newsByCompany: Record<string, Date[]> = {}
  for (const article of newsData ?? []) {
    if (!newsByCompany[article.company_id]) newsByCompany[article.company_id] = []
    newsByCompany[article.company_id].push(new Date(article.published_at))
  }

  const scores: Array<{ company_id: string; score_24h: number; score_7d: number }> = []

  for (const company of companies) {
    const companySignals = signalsByCompany[company.id] ?? []
    const companyNews = newsByCompany[company.id] ?? []

    // score_24h
    let score24h = 0
    for (const signal of companySignals) {
      if (new Date(signal.sampled_at) >= cutoff24h) {
        score24h +=
          signal.mention_count * (PLATFORM_WEIGHTS[signal.platform] ?? 1) +
          signal.engagement_score * (ENGAGEMENT_WEIGHTS[signal.platform] ?? 0)
      }
    }
    // Add news in 24h
    const newsIn24h = companyNews.filter((d) => d >= cutoff24h).length
    score24h += newsIn24h * PLATFORM_WEIGHTS.news

    // score_7d with decay
    let score7d = 0
    for (const signal of companySignals) {
      const daysAgo = daysBetween(new Date(signal.sampled_at), now)
      const weight = decayWeight(daysAgo)
      score7d +=
        (signal.mention_count * (PLATFORM_WEIGHTS[signal.platform] ?? 1) +
          signal.engagement_score * (ENGAGEMENT_WEIGHTS[signal.platform] ?? 0)) *
        weight
    }
    for (const date of companyNews) {
      const daysAgo = daysBetween(date, now)
      score7d += PLATFORM_WEIGHTS.news * decayWeight(daysAgo)
    }

    scores.push({
      company_id: company.id,
      score_24h: Math.round(score24h * 100) / 100,
      score_7d: Math.round(score7d * 100) / 100,
    })
  }

  // Compute ranks by 7d score
  scores.sort((a, b) => b.score_7d - a.score_7d)
  const scoredWithRank = scores.map((s, i) => ({
    ...s,
    score_rank: i + 1,
    updated_at: now.toISOString(),
  }))

  // Upsert in batches of 50
  const BATCH_SIZE = 50
  for (let i = 0; i < scoredWithRank.length; i += BATCH_SIZE) {
    const batch = scoredWithRank.slice(i, i + BATCH_SIZE)
    const { error } = await supabase
      .from('buzz_scores')
      .upsert(batch, { onConflict: 'company_id' })

    if (error) {
      errors.push(`Buzz score upsert error (batch ${i / BATCH_SIZE}): ${error.message}`)
    } else {
      updated += batch.length
    }
  }

  return { updated, errors }
}
