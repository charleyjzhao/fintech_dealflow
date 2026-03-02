'use client'

import { useState } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import type { WatchlistItem, Company } from '@/types/database'

interface WatchlistRow extends WatchlistItem {
  companies: Company
}

export function WatchlistSection({ watchlist }: { watchlist: WatchlistRow[] }) {
  const [items, setItems] = useState<WatchlistRow[]>(watchlist)
  const supabase = createClient()

  async function removeFromWatchlist(watchlistId: string) {
    await supabase.from('watchlist').delete().eq('id', watchlistId)
    setItems((prev) => prev.filter((i) => i.id !== watchlistId))
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Watchlist</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No companies in your watchlist yet. Browse the{' '}
            <Link href="/trending" className="text-primary hover:underline">
              trending page
            </Link>{' '}
            to add some.
          </p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const company = item.companies
              const initials = company.name
                .split(' ')
                .slice(0, 2)
                .map((w) => w[0])
                .join('')
                .toUpperCase()

              return (
                <div key={item.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                  <Avatar className="h-8 w-8 rounded-md flex-shrink-0">
                    <AvatarImage src={company.logo_url ?? ''} alt={company.name} />
                    <AvatarFallback className="rounded-md text-xs font-bold bg-primary/10 text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  <Link
                    href={`/company/${company.slug}`}
                    className="flex-1 text-sm font-medium hover:text-primary transition-colors"
                  >
                    {company.name}
                  </Link>

                  {company.subsectors.slice(0, 1).map((s) => (
                    <Badge key={s} variant="secondary" className="text-xs capitalize hidden sm:flex">
                      {s}
                    </Badge>
                  ))}

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeFromWatchlist(item.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
