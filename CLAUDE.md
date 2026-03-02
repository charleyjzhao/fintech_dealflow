# Fintech First — Claude Code Project Notes

## What This Project Is
Public site aggregating fintech funding activity and social buzz. Surfaces who raised money AND who is generating excitement (bootstrapped companies, stealth fintechs, new product launches). Brand name: **Fintech First**.

---

## Tech Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Frontend | Next.js 14 (App Router) | SSR + client components |
| Database | Supabase (Postgres + RLS + Realtime) | |
| Auth | Supabase Auth (`@supabase/ssr`) | Cookie-based |
| Styling | Tailwind CSS **v3** + shadcn/ui | **Must stay on v3** — see gotchas |
| Charts | Recharts | Used in BuzzChart |
| Hosting | Vercel | With Cron |

---

## Critical Gotchas

- **Tailwind must be v3** (`tailwindcss@3`). v4 breaks PostCSS config with Next.js 14.
- **`next.config.mjs`** not `.ts` — Next.js 14 doesn't support TypeScript config files.
- **Supabase types** in `types/database.ts` must use the full format with `Row/Insert/Update/Relationships` nested objects, not just plain interfaces.
- **`buzz_scores`** joins through `companies`, not directly from `funding_rounds`. Query: `companies!inner(*, buzz_scores(*))`.
- **`darkMode`** in `tailwind.config.ts` must be `'class'` (string), not `['class']` (array) for Tailwind v3.

---

## Project Structure

```
/app
  page.tsx                       — Deal Feed (SSR + Realtime)
  trending/page.tsx              — Trending (ISR, revalidate=3600)
  company/[slug]/page.tsx        — Company Profile (SSR)
  preferences/page.tsx           — User prefs (auth-gated)
  auth/{login,signup,signout,callback}/
  api/cron/
    sync-funding/route.ts        — Crunchbase API
    sync-news/route.ts           — NewsAPI + RSS
    sync-social/route.ts         — X, Reddit, Bluesky
    compute-buzz/route.ts        — Buzz score computation

/components
  Navbar.tsx
  feed/{DealCard,FeedFilters,RealtimeFeed}.tsx
  trending/TrendingCard.tsx
  company/{CompanyHeader,BuzzChart}.tsx
  ui/                            — shadcn/ui components

/lib
  supabase/{client,server}.ts    — browser + server Supabase clients
  ingestion/{crunchbase,newsapi,rss,x-api,reddit,bluesky}.ts
  scoring/buzz.ts                — buzz score computation
  utils.ts                       — formatCurrency, formatDate, SUBSECTORS, ROUND_STAGES, GEOGRAPHIES

/types/database.ts               — Full Supabase-format DB types
/supabase/migrations/            — 001_initial_schema, 002_rls_policies, 003_seed_companies
/middleware.ts                   — Session refresh
/vercel.json                     — Cron schedules
```

---

## Database Tables

- `companies` — core registry (includes bootstrap/no-funding companies), ~50 seeded
- `funding_rounds` — FK→companies
- `news_articles` — FK→companies, UNIQUE on `url`
- `social_signals` — hourly snapshots per platform (`x`/`reddit`/`bluesky`/`news`)
- `buzz_scores` — pre-computed, PK=`company_id`, refreshed hourly
- `user_preferences` — RLS user-scoped only
- `watchlist` — RLS user-scoped, UNIQUE(user_id, company_id)

**RLS:** All tables publicly readable except `user_preferences` and `watchlist`. Writes require `service_role` (cron) or user auth (preferences/watchlist).

---

## Buzz Score Formula

```
score_24h = x_mentions*1.5 + reddit_mentions*1.2 + bluesky_mentions*1.0 + news_articles*2.0
score_7d  = rolling sum with 0.85^days exponential decay (recent days weighted more)
```

---

## Cron Schedule (`vercel.json`)

| Job | Schedule | Source |
|-----|----------|--------|
| sync-funding | Every 6h | Crunchbase API |
| sync-news | Every 2h | NewsAPI + RSS |
| sync-social | :30 every hour | X, Reddit, Bluesky |
| compute-buzz | :45 every hour | Aggregates social_signals |

All cron routes secured with `x-cron-secret` header matching `CRON_SECRET` env var.

---

## ENV Vars (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

CRUNCHBASE_API_KEY        # Crunchbase Basic API
NEWSAPI_KEY               # newsapi.org
X_BEARER_TOKEN            # X API v2 bearer token
REDDIT_CLIENT_ID
REDDIT_CLIENT_SECRET
REDDIT_USER_AGENT         # = fintech-dealflow/1.0

BLUESKY_IDENTIFIER        # e.g. yourname.bsky.social
BLUESKY_APP_PASSWORD      # Settings → Privacy → App Passwords

CRON_SECRET               # Random string for securing cron routes
NEXT_PUBLIC_SITE_URL      # http://localhost:3000 in dev
```

---

## Data Ingestion Status

| Source | Status | Notes |
|--------|--------|-------|
| RSS (TechCrunch, The Block) | ✅ Working | 7 articles on first run. Axios Pro Rata returns 403 — ignored. |
| Bluesky | ✅ Fixed | Switched to `bsky.social` with session auth. Requires `BLUESKY_IDENTIFIER` + `BLUESKY_APP_PASSWORD`. Skips gracefully if not set. |
| NewsAPI | ✅ Working | 6 articles on first run. |
| Reddit | ⏳ Pending | Needs `REDDIT_CLIENT_ID`/`REDDIT_CLIENT_SECRET` from reddit.com/prefs/apps |
| X (Twitter) | ⏳ Pending | Needs `X_BEARER_TOKEN`. Batches 10 companies/query, max_results=30, 12h cooldown guard. Budget: 9,000 tweets/month. |
| Crunchbase | ⏳ Pending | Needs `CRUNCHBASE_API_KEY` — requires approval |

---

## UI Notes

- **Multi-select dropdowns** in `FeedFilters.tsx` are custom-built (no Radix) using checkboxes + click-outside `useRef`. Each has a "Select All / Clear All" row.
- **Filter chips** row is always rendered (unconditionally) with `min-h-[1.75rem]` to prevent layout shift when chips appear/disappear.
- **Amount filter** stays single-select (it's a threshold, not a list).
- URL params use comma-separated multi-values: `?subsectors=payments,lending&stages=Seed,Series+A`.
- Subsector filtering is done client-side (JS post-fetch) because PostgREST array overlap on joined tables is unreliable.

---

## Supabase Clients

- `lib/supabase/client.ts` — browser client (for client components / Realtime)
- `lib/supabase/server.ts`:
  - `createClient()` — server client using cookies (for SSR pages, RSC)
  - `createServiceClient()` — service role client for cron/ingestion jobs (bypasses RLS)

---

## Build Status

All routes build cleanly. Run `npx tsc --noEmit` to check types. Dev server: `npm run dev`.
