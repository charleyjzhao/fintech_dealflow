-- ============================================================
-- 002_rls_policies.sql
-- Row Level Security policies
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE funding_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE buzz_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PUBLIC READ TABLES
-- companies, funding_rounds, news_articles, social_signals, buzz_scores
-- ============================================================

-- companies: anyone can read
CREATE POLICY "companies_public_read" ON companies
  FOR SELECT USING (true);

-- companies: service role can write
CREATE POLICY "companies_service_write" ON companies
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- funding_rounds: anyone can read
CREATE POLICY "funding_rounds_public_read" ON funding_rounds
  FOR SELECT USING (true);

CREATE POLICY "funding_rounds_service_write" ON funding_rounds
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- news_articles: anyone can read
CREATE POLICY "news_articles_public_read" ON news_articles
  FOR SELECT USING (true);

CREATE POLICY "news_articles_service_write" ON news_articles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- social_signals: anyone can read
CREATE POLICY "social_signals_public_read" ON social_signals
  FOR SELECT USING (true);

CREATE POLICY "social_signals_service_write" ON social_signals
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- buzz_scores: anyone can read
CREATE POLICY "buzz_scores_public_read" ON buzz_scores
  FOR SELECT USING (true);

CREATE POLICY "buzz_scores_service_write" ON buzz_scores
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- USER-SCOPED TABLES
-- user_preferences, watchlist
-- ============================================================

-- user_preferences: users can only see and edit their own
CREATE POLICY "user_preferences_owner_select" ON user_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_preferences_owner_insert" ON user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_preferences_owner_update" ON user_preferences
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_preferences_owner_delete" ON user_preferences
  FOR DELETE USING (auth.uid() = user_id);

-- watchlist: users can only see and edit their own
CREATE POLICY "watchlist_owner_select" ON watchlist
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "watchlist_owner_insert" ON watchlist
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "watchlist_owner_delete" ON watchlist
  FOR DELETE USING (auth.uid() = user_id);
