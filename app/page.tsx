import { Suspense } from 'react'
import { TrendingUp, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TrendingCard } from '@/components/trending/TrendingCard'
import { Skeleton } from '@/components/ui/skeleton'
import type { CompanyWithBuzz } from '@/types/database'

// ISR: revalidate every hour
export const revalidate = 3600

async function getTrendingCompanies() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('companies')
    .select(`
      *,
      buzz_scores (*)
    `)
    .not('buzz_scores', 'is', null)
    .order('buzz_scores(score_7d)', { ascending: false })
    .limit(50)

  return (data as CompanyWithBuzz[]) ?? []
}

function TrendingList({
  companies,
  scoreType,
}: {
  companies: CompanyWithBuzz[]
  scoreType: '7d' | '24h'
}) {
  const sorted = [...companies].sort((a, b) => {
    const scoreA = scoreType === '24h' ? (a.buzz_scores?.score_24h ?? 0) : (a.buzz_scores?.score_7d ?? 0)
    const scoreB = scoreType === '24h' ? (b.buzz_scores?.score_24h ?? 0) : (b.buzz_scores?.score_7d ?? 0)
    return scoreB - scoreA
  })

  const maxScore = sorted[0]
    ? (scoreType === '24h'
        ? (sorted[0].buzz_scores?.score_24h ?? 0)
        : (sorted[0].buzz_scores?.score_7d ?? 0))
    : 1

  if (sorted.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p className="font-medium">No buzz data yet</p>
        <p className="text-sm mt-1">Social signals are collected hourly</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {sorted.map((company, i) => (
        <TrendingCard
          key={company.id}
          company={company}
          rank={i + 1}
          scoreType={scoreType}
          maxScore={maxScore}
        />
      ))}
    </div>
  )
}

export default async function TrendingPage() {
  const companies = await getTrendingCompanies()

  return (
    <div className="container py-8 max-w-3xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Trending Fintechs</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Companies generating the most buzz across Bluesky and the web — with or without a funding round.
        </p>
      </div>

      <Tabs defaultValue="7d">
        <TabsList className="mb-5">
          <TabsTrigger value="7d" className="flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4" />
            7-Day Momentum
          </TabsTrigger>
          <TabsTrigger value="24h" className="flex items-center gap-1.5">
            <Zap className="h-4 w-4" />
            Last 24h Spike
          </TabsTrigger>
        </TabsList>

        <TabsContent value="7d">
          <TrendingList companies={companies} scoreType="7d" />
        </TabsContent>
        <TabsContent value="24h">
          <TrendingList companies={companies} scoreType="24h" />
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground mt-6 text-center">
        Buzz scores updated hourly · Last updated {new Date().toLocaleTimeString()}
      </p>
    </div>
  )
}
