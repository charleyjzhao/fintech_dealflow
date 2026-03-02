CREATE TABLE IF NOT EXISTS bluesky_posts (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  post_uri      text NOT NULL UNIQUE,
  post_text     text NOT NULL,
  author_handle text,
  author_name   text,
  like_count    int NOT NULL DEFAULT 0,
  reply_count   int NOT NULL DEFAULT 0,
  repost_count  int NOT NULL DEFAULT 0,
  posted_at     timestamptz NOT NULL,
  indexed_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bluesky_posts_company_id ON bluesky_posts (company_id);
CREATE INDEX IF NOT EXISTS idx_bluesky_posts_posted_at  ON bluesky_posts (posted_at DESC);

ALTER TABLE bluesky_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bluesky_posts_public_read" ON bluesky_posts FOR SELECT USING (true);
