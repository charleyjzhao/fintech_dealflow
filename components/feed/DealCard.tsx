import Link from 'next/link'
import { ExternalLink, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatCurrency, formatRelativeTime } from '@/lib/utils'
import type { FundingRoundWithCompany } from '@/types/database'

interface DealCardProps {
  round: FundingRoundWithCompany
}

const STAGE_COLORS: Record<string, 'green' | 'blue' | 'purple' | 'orange' | 'default'> = {
  'Seed': 'green',
  'Pre-Seed': 'green',
  'Series A': 'blue',
  'Series B': 'purple',
  'Series C': 'orange',
  'Series D+': 'orange',
  'Growth': 'orange',
  'Debt': 'default',
  'Convertible Note': 'default',
}

function BuzzBadge({ score }: { score: number }) {
  if (score === 0) return null
  const level = score > 200 ? 'hot' : score > 50 ? 'warm' : 'low'
  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <TrendingUp className={`h-3 w-3 ${level === 'hot' ? 'text-orange-500' : level === 'warm' ? 'text-yellow-500' : 'text-gray-400'}`} />
      <span className={level === 'hot' ? 'text-orange-500 font-medium' : ''}>{Math.round(score)}</span>
    </div>
  )
}

export function DealCard({ round }: DealCardProps) {
  const company = round.companies
  const buzzScore = company.buzz_scores?.score_24h ?? 0
  const stageColor = STAGE_COLORS[round.round_type] ?? 'default'

  const initials = company.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12 rounded-lg">
            <AvatarImage src={company.logo_url ?? ''} alt={company.name} />
            <AvatarFallback className="rounded-lg text-sm font-semibold bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Link
                  href={`/company/${company.slug}`}
                  className="font-semibold text-base hover:text-primary transition-colors leading-tight"
                >
                  {company.name}
                </Link>
                <div className="flex items-center gap-2 mt-0.5 text-sm text-muted-foreground">
                  {company.hq_city && company.hq_country && (
                    <span>{company.hq_city}, {company.hq_country}</span>
                  )}
                  {company.hq_country && !company.hq_city && (
                    <span>{company.hq_country}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <BuzzBadge score={buzzScore} />
                {round.source_url && (
                  <a
                    href={round.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <Badge variant={stageColor}>{round.round_type}</Badge>
              <span className="text-lg font-bold text-foreground">
                {formatCurrency(round.amount_usd)}
              </span>
              <span className="text-sm text-muted-foreground">
                {formatRelativeTime(round.announced_date)}
              </span>
            </div>

            {round.lead_investors.length > 0 && (
              <p className="mt-2 text-sm text-muted-foreground">
                <span className="font-medium">Led by</span>{' '}
                {round.lead_investors.slice(0, 2).join(', ')}
                {round.lead_investors.length > 2 && ` +${round.lead_investors.length - 2} more`}
              </p>
            )}

            {company.subsectors.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {company.subsectors.slice(0, 3).map((sector) => (
                  <Badge key={sector} variant="secondary" className="text-xs capitalize">
                    {sector}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
