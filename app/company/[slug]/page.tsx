import { notFound } from 'next/navigation'
import { Newspaper, TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CompanyHeader } from '@/components/company/CompanyHeader'
import { BuzzChart } from '@/components/company/BuzzChart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatRelativeTime } from '@/lib/utils'
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
  const [newsArticlesRes, socialSignalsRes, buzzScoreRes] = await Promise.all([
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

  const newsArticles = newsArticlesRes.data ?? []
  const socialSignals = socialSignalsRes.data ?? []
  const buzzScore: BuzzScore | null = buzzScoreRes.data

  return (
    <div className="container py-8 max-w-4xl">
      <CompanyHeader company={company} buzzScore={buzzScore} />

      <div className="space-y-6">
        {/* Social buzz chart */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Social Buzz (7-Day)
              </CardTitle>
              {buzzScore && (
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">
                    7d <span className="font-semibold text-foreground ml-1">{Math.round(buzzScore.score_7d)}</span>
                  </span>
                  <span className="text-muted-foreground">
                    24h <span className="font-semibold text-foreground ml-1">{Math.round(buzzScore.score_24h)}</span>
                  </span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <BuzzChart signals={socialSignals} />
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-violet-500 inline-block" /> Bluesky
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Web Articles
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
    </div>
  )
}
