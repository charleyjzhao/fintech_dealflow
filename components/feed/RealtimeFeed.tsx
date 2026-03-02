'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DealCard } from './DealCard'
import type { FundingRoundWithCompany } from '@/types/database'

interface RealtimeFeedProps {
  initialRounds: FundingRoundWithCompany[]
}

export function RealtimeFeed({ initialRounds }: RealtimeFeedProps) {
  const [rounds, setRounds] = useState<FundingRoundWithCompany[]>(initialRounds)
  const [newCount, setNewCount] = useState(0)

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('funding_rounds_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'funding_rounds',
        },
        async (payload) => {
          // Fetch the full round with company data
          const { data } = await supabase
            .from('funding_rounds')
            .select(`
              *,
              companies (
                *,
                buzz_scores (*)
              )
            `)
            .eq('id', payload.new.id)
            .single()

          if (data) {
            setRounds((prev) => [data as unknown as FundingRoundWithCompany, ...prev])
            setNewCount((c) => c + 1)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  if (rounds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
        <p className="text-lg font-medium">No deals found</p>
        <p className="text-sm mt-1">Try adjusting your filters</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {newCount > 0 && (
        <div className="text-center">
          <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium animate-pulse">
            {newCount} new deal{newCount > 1 ? 's' : ''} — scroll up
          </span>
        </div>
      )}
      {rounds.map((round) => (
        <DealCard key={round.id} round={round} />
      ))}
    </div>
  )
}
