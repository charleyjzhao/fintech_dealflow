import Link from 'next/link'
import { TrendingUp, Bookmark } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { CompanyWithBuzz } from '@/types/database'
import { getLogoUrl } from '@/lib/utils'

interface TrendingCardProps {
  company: CompanyWithBuzz
  rank: number
  scoreType: '7d' | '24h'
}

function BuzzBar({ score, maxScore }: { score: number; maxScore: number }) {
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0
  return (
    <div className="flex items-center gap-2 mt-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground w-8 text-right">{Math.round(score)}</span>
    </div>
  )
}

export function TrendingCard({
  company,
  rank,
  scoreType,
  maxScore,
}: TrendingCardProps & { maxScore: number }) {
  const score = scoreType === '24h'
    ? (company.buzz_scores?.score_24h ?? 0)
    : (company.buzz_scores?.score_7d ?? 0)

  const initials = company.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  const rankColor =
    rank === 1
      ? 'text-yellow-500'
      : rank === 2
      ? 'text-gray-400'
      : rank === 3
      ? 'text-amber-600'
      : 'text-muted-foreground'

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <span className={`text-lg font-bold w-7 text-right flex-shrink-0 ${rankColor}`}>
            {rank}
          </span>

          <Avatar className="h-10 w-10 rounded-lg flex-shrink-0">
            <AvatarImage src={getLogoUrl(company) ?? ''} alt={company.name} />
            <AvatarFallback className="rounded-lg text-xs font-bold bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <Link
                href={`/company/${company.slug}`}
                className="font-semibold text-sm hover:text-primary transition-colors truncate"
              >
                {company.name}
              </Link>
              <div className="flex items-center gap-1 flex-shrink-0 text-xs text-primary font-medium">
                <TrendingUp className="h-3.5 w-3.5" />
                {score > 100 ? 'Hot' : score > 30 ? 'Rising' : 'New'}
              </div>
            </div>

            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              {company.hq_country && (
                <span className="text-xs text-muted-foreground">{company.hq_country}</span>
              )}
              {company.subsectors.slice(0, 2).map((s) => (
                <Badge key={s} variant="secondary" className="text-xs capitalize px-1.5 py-0">
                  {s}
                </Badge>
              ))}
            </div>

            <BuzzBar score={score} maxScore={maxScore} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
