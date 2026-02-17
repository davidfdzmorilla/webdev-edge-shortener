-- PostgreSQL schema for Edge URL Shortener
CREATE TABLE IF NOT EXISTS urls (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         TEXT UNIQUE NOT NULL,
  original_url TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  click_count  BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS clicks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT NOT NULL,
  clicked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  country     TEXT,
  user_agent  TEXT,
  referrer    TEXT
);

CREATE INDEX IF NOT EXISTS idx_urls_slug   ON urls(slug);
CREATE INDEX IF NOT EXISTS idx_clicks_slug ON clicks(slug);
CREATE INDEX IF NOT EXISTS idx_clicks_time ON clicks(clicked_at DESC);
