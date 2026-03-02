/**
 * Crunchbase Basic API ingestion
 * Pulls recent funding rounds and upserts companies + rounds into Supabase
 *
 * Docs: https://data.crunchbase.com/reference/overview
 * Auth: X-cb-user-key header (Basic API key)
 */

import { createServiceClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/utils'

const CRUNCHBASE_BASE = 'https://api.crunchbase.com/api/v4'

interface CrunchbaseOrganization {
  uuid: string
  properties: {
    identifier: { permalink: string; value: string }
    short_description: string | null
    website_url: string | null
    founded_on: { value: string } | null
    location_identifiers: Array<{ value: string; location_type: string }>
    categories: Array<{ value: string }>
    num_employees_enum: string | null
    logo_url: string | null
  }
}

interface CrunchbaseFundingRound {
  uuid: string
  properties: {
    identifier: { permalink: string }
    funded_organization_identifier: { uuid: string; value: string }
    investment_type: string | null
    money_raised: { value_usd: number | null } | null
    announced_on: { value: string } | null
    lead_investors: Array<{ value: string }> | null
    investor_identifiers: Array<{ value: string }> | null
    news_url: string | null
  }
}

function mapEmployeeRange(enumVal: string | null): string | null {
  const map: Record<string, string> = {
    c_00001_00010: '1-10',
    c_00011_00050: '11-50',
    c_00051_00100: '51-100',
    c_00101_00250: '101-250',
    c_00251_00500: '251-500',
    c_00501_01000: '501-1000',
    c_01001_05000: '1001-5000',
    c_05001_10000: '5001-10000',
    c_10001_max: '10001+',
  }
  return enumVal ? (map[enumVal] ?? null) : null
}

export async function syncFundingRounds(daysBack = 7): Promise<{ inserted: number; errors: string[] }> {
  const apiKey = process.env.CRUNCHBASE_API_KEY
  if (!apiKey) throw new Error('CRUNCHBASE_API_KEY not set')

  const supabase = createServiceClient()
  const errors: string[] = []
  let inserted = 0

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysBack)
  const dateStr = cutoffDate.toISOString().split('T')[0]

  const searchBody = {
    field_ids: [
      'identifier',
      'funded_organization_identifier',
      'investment_type',
      'money_raised',
      'announced_on',
      'lead_investors',
      'investor_identifiers',
      'news_url',
    ],
    query: [
      {
        type: 'predicate',
        field_id: 'announced_on',
        operator_id: 'gte',
        values: [dateStr],
      },
      {
        type: 'predicate',
        field_id: 'funded_organization_categories',
        operator_id: 'includes',
        values: ['financial-services', 'fintech', 'payments', 'lending', 'insurance', 'banking'],
      },
    ],
    order: [{ field_id: 'announced_on', sort: 'desc' }],
    limit: 100,
  }

  const roundsRes = await fetch(`${CRUNCHBASE_BASE}/searches/funding_rounds?user_key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(searchBody),
  })

  if (!roundsRes.ok) {
    throw new Error(`Crunchbase rounds search failed: ${roundsRes.status} ${await roundsRes.text()}`)
  }

  const roundsData = await roundsRes.json()
  const rounds: CrunchbaseFundingRound[] = roundsData.entities ?? []

  for (const round of rounds) {
    const p = round.properties
    const orgUuid = p.funded_organization_identifier?.uuid
    const orgName = p.funded_organization_identifier?.value

    if (!orgUuid || !orgName) continue

    // Upsert company (minimal record — org details fetched separately if needed)
    const slug = slugify(orgName)
    const { error: companyErr } = await supabase
      .from('companies')
      .upsert(
        {
          name: orgName,
          slug,
          crunchbase_id: orgUuid,
          subsectors: [],
          is_public: false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'slug', ignoreDuplicates: false }
      )

    if (companyErr) {
      errors.push(`Company upsert error for ${orgName}: ${companyErr.message}`)
      continue
    }

    // Fetch company id
    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .eq('slug', slug)
      .single()

    if (!company) continue

    // Upsert funding round
    const { error: roundErr } = await supabase
      .from('funding_rounds')
      .upsert(
        {
          company_id: company.id,
          round_type: p.investment_type ?? 'Unknown',
          amount_usd: p.money_raised?.value_usd ?? null,
          announced_date: p.announced_on?.value ?? new Date().toISOString().split('T')[0],
          lead_investors: (p.lead_investors ?? []).map((i) => i.value),
          all_investors: (p.investor_identifiers ?? []).map((i) => i.value),
          source_url: p.news_url ?? null,
          source: 'crunchbase',
        },
        { onConflict: 'id', ignoreDuplicates: false }
      )

    if (roundErr) {
      errors.push(`Round upsert error for ${orgName}: ${roundErr.message}`)
    } else {
      inserted++
    }
  }

  return { inserted, errors }
}

export async function enrichCompanyFromCrunchbase(crunchbaseId: string): Promise<void> {
  const apiKey = process.env.CRUNCHBASE_API_KEY
  if (!apiKey) throw new Error('CRUNCHBASE_API_KEY not set')

  const supabase = createServiceClient()

  const res = await fetch(
    `${CRUNCHBASE_BASE}/entities/organizations/${crunchbaseId}?user_key=${apiKey}&field_ids=short_description,website_url,founded_on,location_identifiers,categories,num_employees_enum,logo_url`,
    { headers: { 'Content-Type': 'application/json' } }
  )

  if (!res.ok) return

  const data = await res.json()
  const org: CrunchbaseOrganization = data

  const locations = org.properties.location_identifiers ?? []
  const country = locations.find((l) => l.location_type === 'country')?.value ?? null
  const city = locations.find((l) => l.location_type === 'city')?.value ?? null
  const subsectors = (org.properties.categories ?? []).map((c) => c.value.toLowerCase())

  await supabase
    .from('companies')
    .update({
      description: org.properties.short_description,
      website: org.properties.website_url,
      founded_year: org.properties.founded_on
        ? parseInt(org.properties.founded_on.value.split('-')[0])
        : null,
      hq_country: country,
      hq_city: city,
      subsectors,
      employee_count_range: mapEmployeeRange(org.properties.num_employees_enum),
      logo_url: org.properties.logo_url,
      updated_at: new Date().toISOString(),
    })
    .eq('crunchbase_id', crunchbaseId)
}
