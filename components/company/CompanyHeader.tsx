import Link from 'next/link'
import { ExternalLink, Globe, MapPin, Users } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import type { Company, BuzzScore } from '@/types/database'
import { getLogoUrl } from '@/lib/utils'

interface CompanyHeaderProps {
  company: Company
  buzzScore?: BuzzScore | null
  isWatchlisted?: boolean
}

export function CompanyHeader({ company, buzzScore }: CompanyHeaderProps) {
  const initials = company.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  return (
    <div className="border-b pb-6 mb-6">
      <div className="flex items-start gap-5">
        <Avatar className="h-16 w-16 rounded-xl flex-shrink-0">
          <AvatarImage src={getLogoUrl(company) ?? ''} alt={company.name} />
          <AvatarFallback className="rounded-xl text-xl font-bold bg-primary/10 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 h-16 flex flex-col">
          <h1 className="text-2xl font-bold">{company.name}</h1>

          <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {company.hq_city && company.hq_country && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {company.hq_city}, {company.hq_country}
              </span>
            )}
            {company.hq_country && !company.hq_city && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {company.hq_country}
              </span>
            )}
            {company.employee_count_range && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                {company.employee_count_range} employees
              </span>
            )}
            {company.founded_year && (
              <span className="text-sm text-muted-foreground">
                Founded {company.founded_year}
              </span>
            )}
            {company.website && (
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <Globe className="h-3.5 w-3.5" />
                Website
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {company.is_public && (
              <Badge variant="outline">Public</Badge>
            )}
            {company.subsectors.map((s) => (
              <Link key={s} href={`/?subsector=${s}`} className="contents">
                <Badge variant="secondary" className="capitalize cursor-pointer hover:bg-secondary/70">
                  {s.replace('-', ' ')}
                </Badge>
              </Link>
            ))}
            {company.business_model && (
              <Badge variant="secondary" className="capitalize">{company.business_model}</Badge>
            )}
          </div>
        </div>

        {buzzScore && buzzScore.score_7d > 0 && (
          <div className="flex-shrink-0 text-center bg-primary/5 rounded-lg px-3 py-2">
            <div className="text-2xl font-bold text-primary">
              #{buzzScore.score_rank}
            </div>
            <div className="text-xs text-muted-foreground">Buzz Rank</div>
          </div>
        )}
      </div>

      {company.description && (
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed max-w-2xl pl-[84px]">
          {company.description}
        </p>
      )}
    </div>
  )
}
