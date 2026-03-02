import { notFound } from 'next/navigation'
import { Newspaper, TrendingUp, DollarSign, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CompanyHeader } from '@/components/company/CompanyHeader'
import { BuzzChart } from '@/components/company/BuzzChart'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatDate, formatRelativeTime } from '@/lib/utils'
import type { Metadata } from 'next'
import type { BuzzScore } from '@/types/database'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data: company } = await supabase
    .from('companies')
    .select('name, description')
    .eq('slug', slug)
    .single()

  if (!company) return {}

  return {
    title: `${company.name} — Fintech First`,
    description: company.description ?? `Track ${company.name} funding rounds and social buzz.`,
  }
}

export default async function CompanyPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  // First fetch the company
  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!company) notFound()

  // Now fetch related data using the company id
  const [fundingRoundsRes, newsArticlesRes, socialSignalsRes, buzzScoreRes] = await Promise.all([
    supabase
      .from('funding_rounds')
      .select('*')
      .eq('company_id', company.id)
      .order('announced_date', { ascending: false }),
    supabase
      .from('news_articles')
      .select('*')
      .eq('company_id', company.id)
      .order('published_at', { ascending: false })
      .limit(10),
    supabase
      .from('social_signals')
      .select('*')
      .eq('company_id', company.id)
      .gte('sampled_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('sampled_at', { ascending: true }),
    supabase
      .from('buzz_scores')
      .select('*')
      .eq('company_id', company.id)
      .single(),
  ])

  const fundingRounds = fundingRoundsRes.data ?? []
  const newsArticles = newsArticlesRes.data ?? []
  const socialSignals = socialSignalsRes.data ?? []
  const buzzScore: BuzzScore | null = buzzScoreRes.data

  const totalRaised = fundingRounds.reduce((sum, r) => sum + (r.amount_usd ?? 0), 0)
  const allInvestors = Array.from(new Set(fundingRounds.flatMap((r) => r.all_investors)))

  return (
    <div className="container py-8 max-w-4xl">
      <CompanyHeader company={company} buzzScore={buzzScore} />

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <DollarSign className="h-3.5 w-3.5" />
              Total Raised
            </div>
            <div className="text-xl font-bold">
              {totalRaised > 0 ? formatCurrency(totalRaised) : '—'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <TrendingUp className="h-3.5 w-3.5" />
              Buzz Score (7d)
            </div>
            <div className="text-xl font-bold">
              {buzzScore ? Math.round(buzzScore.score_7d) : '—'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Newspaper className="h-3.5 w-3.5" />
              Funding Rounds
            </div>
            <div className="text-xl font-bold">{fundingRounds.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Users className="h-3.5 w-3.5" />
              Investors
            </div>
            <div className="text-xl font-bold">{allInvestors.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left column: Funding + Buzz chart + News */}
        <div className="md:col-span-2 space-y-6">
          {/* Funding history */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Funding History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {fundingRounds.length === 0 ? (
                <p className="text-sm text-muted-foreground">No funding rounds on record</p>
              ) : (
                <div className="space-y-4">
                  {fundingRounds.map((round) => (
                    <div key={round.id} className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="blue">{round.round_type}</Badge>
                          <span className="font-semibold text-sm">
                            {formatCurrency(round.amount_usd)}
                          </span>
                        </div>
                        {round.lead_investors.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {round.lead_investors.slice(0, 3).join(', ')}
                            {round.lead_investors.length > 3 && ` +${round.lead_investors.length - 3}`}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatDate(round.announced_date)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Social buzz chart */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Social Buzz (7-Day)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BuzzChart signals={socialSignals} />
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> X
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" /> Reddit
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-violet-500 inline-block" /> Bluesky
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Recent news */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Newspaper className="h-4 w-4" />
                Recent News
              </CardTitle>
            </CardHeader>
            <CardContent>
              {newsArticles.length === 0 ? (
                <p className="text-sm text-muted-foreground">No news articles yet</p>
              ) : (
                <div className="space-y-3">
                  {newsArticles.map((article) => (
                    <div key={article.id} className="border-b last:border-0 pb-3 last:pb-0">
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium hover:text-primary transition-colors line-clamp-2"
                      >
                        {article.title}
                      </a>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>{article.source}</span>
                        <span>·</span>
                        <span>{formatRelativeTime(article.published_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: Investors */}
        <div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Investors
              </CardTitle>
            </CardHeader>
            <CardContent>
              {allInvestors.length === 0 ? (
                <p className="text-sm text-muted-foreground">No investors on record</p>
              ) : (
                <div className="space-y-1.5">
                  {allInvestors.slice(0, 20).map((investor) => (
                    <div key={investor} className="text-sm py-1 border-b last:border-0">
                      {investor}
                    </div>
                  ))}
                  {allInvestors.length > 20 && (
                    <p className="text-xs text-muted-foreground pt-1">
                      +{allInvestors.length - 20} more
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
