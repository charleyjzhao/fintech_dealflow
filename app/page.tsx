import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { FeedFilters } from '@/components/feed/FeedFilters'
import { RealtimeFeed } from '@/components/feed/RealtimeFeed'
import { Skeleton } from '@/components/ui/skeleton'
import type { FundingRoundWithCompany } from '@/types/database'

interface PageProps {
  searchParams: Promise<{
    subsectors?: string   // comma-separated
    stages?: string       // comma-separated
    geographies?: string  // comma-separated
    minAmount?: string
  }>
}

function parseList(val?: string): string[] {
  return val ? val.split(',').filter(Boolean) : []
}

async function DealFeedContent({
  searchParams,
}: {
  searchParams: Awaited<PageProps['searchParams']>
}) {
  const supabase = await createClient()

  const selectedStages = parseList(searchParams.stages)
  const selectedGeos   = parseList(searchParams.geographies)
  const selectedSectors = parseList(searchParams.subsectors)

  let query = supabase
    .from('funding_rounds')
    .select(`
      *,
      companies!inner (
        *,
        buzz_scores (*)
      )
    `)
    .order('announced_date', { ascending: false })
    .limit(100)

  // Stage filter — on funding_rounds.round_type directly
  if (selectedStages.length === 1) {
    query = query.eq('round_type', selectedStages[0])
  } else if (selectedStages.length > 1) {
    query = query.in('round_type', selectedStages)
  }

  // Amount filter
  if (searchParams.minAmount) {
    query = query.gte('amount_usd', parseInt(searchParams.minAmount))
  }

  // Geography filter — on embedded companies table
  if (selectedGeos.length === 1) {
    query = query.eq('companies.hq_country', selectedGeos[0])
  } else if (selectedGeos.length > 1) {
    query = query.in('companies.hq_country', selectedGeos)
  }

  const { data: rounds } = await query

  // Subsector filter — applied in JS after fetch (array overlap on joined table)
  const filtered =
    selectedSectors.length === 0
      ? (rounds as unknown as FundingRoundWithCompany[]) ?? []
      : ((rounds as unknown as FundingRoundWithCompany[]) ?? []).filter((r) =>
          r.companies.subsectors.some((s) => selectedSectors.includes(s))
        )

  return <RealtimeFeed initialRounds={filtered} />
}

function FeedSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-lg border p-5">
          <div className="flex gap-4">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
              <div className="flex gap-2 mt-3">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default async function DealFeedPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams

  const currentFilters = {
    subsectors:   resolvedParams.subsectors,
    stages:       resolvedParams.stages,
    geographies:  resolvedParams.geographies,
    minAmount:    resolvedParams.minAmount,
  }

  return (
    <div className="container py-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Deal Feed</h1>
        <p className="text-muted-foreground text-sm">
          Latest fintech funding rounds — live updates as new deals are announced
        </p>
      </div>

      <div className="mb-5">
        <Suspense>
          <FeedFilters currentFilters={currentFilters} />
        </Suspense>
      </div>

      <Suspense fallback={<FeedSkeleton />}>
        <DealFeedContent searchParams={resolvedParams} />
      </Suspense>
    </div>
  )
}
