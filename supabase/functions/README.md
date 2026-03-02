# Supabase Edge Functions

This directory contains Supabase Edge Functions for data ingestion and processing.

## Functions

All cron jobs are implemented as Next.js API routes (not Supabase Edge Functions) for simplicity:
- `/app/api/cron/sync-funding` — Crunchbase funding round sync
- `/app/api/cron/sync-news` — NewsAPI + RSS news sync
- `/app/api/cron/sync-social` — X, Reddit, Bluesky mention sync
- `/app/api/cron/compute-buzz` — Buzz score computation

These are triggered by Vercel Cron (configured in `vercel.json`).

## Deployment

1. Set `CRON_SECRET` in Vercel environment variables
2. Vercel Cron calls each endpoint with `x-cron-secret` header
3. See `vercel.json` for the cron schedule

## Manual Trigger

```bash
curl -X POST https://your-app.vercel.app/api/cron/sync-funding \
  -H "x-cron-secret: YOUR_SECRET"
```
