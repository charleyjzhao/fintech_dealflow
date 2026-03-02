/**
 * Auto-discovery of new fintech companies from funding headlines.
 *
 * Exported functions:
 *   hasFundingSignal(title)                   — quick gate: dollar amount + funding verb
 *   extractCompanyName(title)                 — regex extraction with prefix/category stripping
 *   discoverAndCreateCompany(title, supabase) — full pipeline: gate → extract → upsert → fetch
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { slugify } from '@/lib/utils'

// ── Constants ────────────────────────────────────────────────────────────────

const BLOCKLIST = new Set([
  // Structural/grammatical words
  'the', 'a', 'an', 'this', 'that', 'it', 'its', 'he', 'she', 'they', 'we',
  // Generic business terms
  'startup', 'company', 'firm', 'fund', 'group', 'bank', 'platform', 'app',
  'service', 'services',
  // Fintech category labels
  'fintech', 'neobank', 'insurtech', 'regtech', 'wealthtech', 'payments',
  'lending', 'crypto', 'blockchain',
  // Round-related terms
  'funding', 'round', 'series', 'seed', 'stage', 'pre',
  // Editorial labels
  'exclusive', 'breaking', 'report', 'scoop', 'sponsored',
  // People roles
  'ceo', 'cto', 'cfo', 'founder',
])

// ── hasFundingSignal ─────────────────────────────────────────────────────────

export function hasFundingSignal(title: string): boolean {
  const hasDollarAmount =
    /\$[\d,.]+\s*[BMKbmk](?:illion)?|\$[\d,.]+\s+(?:billion|million|thousand)/i.test(title)
  if (!hasDollarAmount) return false

  const hasFundingVerb =
    /\b(?:raises?|raised|closes?|closed|secures?|secured|lands?|landed|receives?|received|gets?|got|announces?|announced|bags?|bagged|nets?|netted|brings?\s+in|brought\s+in|pulls?\s+in|pulled\s+in|funding\s+round|seed\s+round|series\s+[a-e])\b/i.test(
      title
    )
  return hasFundingVerb
}

// ── extractCompanyName ────────────────────────────────────────────────────────

// Strip common editorial prefixes before extracting the company name
const PREFIX_PATTERN =
  /^(?:exclusive\s*[:\-–—]\s*|breaking\s*[:\-–—]\s*|report\s*[:\-–—]\s*|scoop\s*[:\-–—]\s*|sponsored\s*[:\-–—]\s*)/i

// Strip a single leading fintech category label (e.g. "Neobank Acme raises...")
const CATEGORY_PREFIX_PATTERN =
  /^(?:neobank|insurtech|fintech|wealthtech|regtech|proptech|startup|payments?)\s+/i

// Matches [quoted name] OR [Title-cased word sequence] before a funding verb + dollar amount
// Group 1 = quoted name, Group 2 = unquoted name
const EXTRACTION_REGEX =
  /(?:"([^"]{2,60})"|([ A-Z][A-Za-z0-9.,'&\-\s]{1,49}?))\s+(?:has\s+)?(?:raises?|raised|closes?|closed|secures?|secured|lands?|landed|receives?|received|gets?|got|announces?|announced|bags?|bagged|nets?|netted|pulls?\s+in|pulled\s+in|brings?\s+in|brought\s+in|clinches?|clinched|collects?|collected)\s+(?:a\s+)?(?:\$[\d,.]+\s*[BMKbmk](?:illion)?|\$[\d,.]+\s+(?:billion|million|thousand))/i

function looksLikeCompanyName(name: string): boolean {
  const trimmed = name.trim()
  if (trimmed.length < 2 || trimmed.length > 60) return false

  const firstWord = trimmed.split(/\s+/)[0].toLowerCase()
  if (BLOCKLIST.has(firstWord)) return false

  // Reject long all-caps sequences (likely sentence fragments)
  if (/^[A-Z\s]+$/.test(trimmed) && trimmed.replace(/\s/g, '').length > 5) return false

  if (!/[a-zA-Z]/.test(trimmed)) return false

  return true
}

export function extractCompanyName(title: string): string | null {
  // Strip editorial prefix
  let cleaned = title.trim().replace(PREFIX_PATTERN, '')

  // Strip single leading category label
  cleaned = cleaned.replace(CATEGORY_PREFIX_PATTERN, '')

  const match = EXTRACTION_REGEX.exec(cleaned)
  if (!match) return null

  const raw = (match[1] ?? match[2] ?? '').trim()

  // Strip trailing punctuation
  let name = raw.replace(/[,.\-:]+$/, '').trim()

  // Strip trailing " and <anything>" to handle "Acme and Brex raises $50M" → "Acme"
  name = name.replace(/\s+and\s+\S.*$/i, '').trim()

  if (!looksLikeCompanyName(name)) return null

  return name
}

// ── discoverAndCreateCompany ─────────────────────────────────────────────────

export async function discoverAndCreateCompany(
  title: string,
  supabase: SupabaseClient<Database>
): Promise<{ id: string; name: string } | null> {
  if (!hasFundingSignal(title)) return null

  const name = extractCompanyName(title)
  if (!name) return null

  const slug = slugify(name)

  const { error: upsertError } = await supabase
    .from('companies')
    .upsert(
      {
        name,
        slug,
        subsectors: [],
        is_public: false,
      },
      { onConflict: 'slug', ignoreDuplicates: true }
    )

  if (upsertError) {
    console.warn(`[company-discovery] upsert failed for "${name}": ${upsertError.message}`)
    return null
  }

  const { data: company, error: fetchError } = await supabase
    .from('companies')
    .select('id, name')
    .eq('slug', slug)
    .single()

  if (fetchError || !company) {
    console.warn(
      `[company-discovery] fetch failed for slug "${slug}": ${fetchError?.message ?? 'no row'}`
    )
    return null
  }

  return { id: company.id, name: company.name }
}
