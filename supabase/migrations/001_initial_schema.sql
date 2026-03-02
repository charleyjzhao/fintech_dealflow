-- ============================================================
-- 001_initial_schema.sql
-- Core database schema for Fintech Dealflow
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- fuzzy text search on company names

-- ============================================================
-- COMPANIES
-- Core company registry (includes companies without funding)
-- ============================================================
CREATE TABLE IF NOT EXISTS companies (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          text NOT NULL,
  slug          text UNIQUE NOT NULL,
  description   text,
  website       text,
  founded_year  int,
  hq_country    text,
  hq_city       text,
  subsectors    text[] NOT NULL DEFAULT '{}',
  business_model text CHECK (business_model IN ('B2B', 'B2C', 'B2B2C')),
  verticals     text[],
  employee_count_range text,
  is_public     boolean NOT NULL DEFAULT false,
  crunchbase_id text UNIQUE,
  pitchbook_id  text UNIQUE,
  logo_url      text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies (slug);
CREATE INDEX IF NOT EXISTS idx_companies_subsectors ON companies USING GIN (subsectors);
CREATE INDEX IF NOT EXISTS idx_companies_hq_country ON companies (hq_country);
CREATE INDEX IF NOT EXISTS idx_companies_name_trgm ON companies USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_companies_updated_at ON companies (updated_at DESC);

-- ============================================================
-- FUNDING ROUNDS
-- ============================================================
CREATE TABLE IF NOT EXISTS funding_rounds (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id     uuid NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  round_type     text NOT NULL,
  amount_usd     bigint,
  announced_date date NOT NULL,
  lead_investors text[] NOT NULL DEFAULT '{}',
  all_investors  text[] NOT NULL DEFAULT '{}',
  source_url     text,
  source         text NOT NULL CHECK (source IN ('crunchbase', 'pitchbook', 'manual')),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_funding_rounds_company_id ON funding_rounds (company_id);
CREATE INDEX IF NOT EXISTS idx_funding_rounds_announced_date ON funding_rounds (announced_date DESC);
CREATE INDEX IF NOT EXISTS idx_funding_rounds_round_type ON funding_rounds (round_type);
CREATE INDEX IF NOT EXISTS idx_funding_rounds_amount ON funding_rounds (amount_usd DESC NULLS LAST);

-- ============================================================
-- NEWS ARTICLES
-- ============================================================
CREATE TABLE IF NOT EXISTS news_articles (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  uuid NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  title       text NOT NULL,
  url         text UNIQUE NOT NULL,
  source      text NOT NULL,
  published_at timestamptz NOT NULL,
  summary     text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_news_articles_company_id ON news_articles (company_id);
CREATE INDEX IF NOT EXISTS idx_news_articles_published_at ON news_articles (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_articles_url ON news_articles (url);

-- ============================================================
-- SOCIAL SIGNALS
-- Hourly snapshots of mention/engagement counts per platform
-- ============================================================
CREATE TABLE IF NOT EXISTS social_signals (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       uuid NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  platform         text NOT NULL CHECK (platform IN ('x', 'reddit', 'bluesky', 'news')),
  mention_count    int NOT NULL DEFAULT 0,
  engagement_score int NOT NULL DEFAULT 0,
  sampled_at       timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_social_signals_company_id ON social_signals (company_id);
CREATE INDEX IF NOT EXISTS idx_social_signals_sampled_at ON social_signals (sampled_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_signals_platform ON social_signals (platform);
-- Composite index for efficient buzz computation
CREATE INDEX IF NOT EXISTS idx_social_signals_company_time ON social_signals (company_id, sampled_at DESC);

-- ============================================================
-- BUZZ SCORES
-- Pre-computed, refreshed every hour
-- ============================================================
CREATE TABLE IF NOT EXISTS buzz_scores (
  company_id  uuid PRIMARY KEY REFERENCES companies (id) ON DELETE CASCADE,
  score_7d    float NOT NULL DEFAULT 0,
  score_24h   float NOT NULL DEFAULT 0,
  score_rank  int NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_buzz_scores_score_7d ON buzz_scores (score_7d DESC);
CREATE INDEX IF NOT EXISTS idx_buzz_scores_score_24h ON buzz_scores (score_24h DESC);
CREATE INDEX IF NOT EXISTS idx_buzz_scores_rank ON buzz_scores (score_rank);

-- ============================================================
-- USER PREFERENCES
-- ============================================================
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id               uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  subsectors            text[] NOT NULL DEFAULT '{}',
  stages                text[] NOT NULL DEFAULT '{}',
  min_amount_usd        bigint,
  max_amount_usd        bigint,
  geographies           text[] NOT NULL DEFAULT '{}',
  business_models       text[] NOT NULL DEFAULT '{}',
  email_digest_enabled  boolean NOT NULL DEFAULT false,
  digest_frequency      text CHECK (digest_frequency IN ('daily', 'weekly'))
);

-- ============================================================
-- WATCHLIST
-- ============================================================
CREATE TABLE IF NOT EXISTS watchlist (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  company_id  uuid NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON watchlist (user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_company_id ON watchlist (company_id);

-- ============================================================
-- auto-update updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
