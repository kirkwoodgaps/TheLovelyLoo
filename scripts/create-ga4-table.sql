-- Create table for GA4 metrics
CREATE TABLE IF NOT EXISTS ga4_metrics (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  sessions INTEGER DEFAULT 0,
  users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  page_views INTEGER DEFAULT 0,
  bounce_rate DECIMAL(5,4) DEFAULT 0,
  avg_session_duration DECIMAL(10,2) DEFAULT 0,
  source TEXT,
  medium TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(date, source, medium)
);

-- Create index for faster date-based queries
CREATE INDEX IF NOT EXISTS idx_ga4_date ON ga4_metrics(date);
CREATE INDEX IF NOT EXISTS idx_ga4_source ON ga4_metrics(source);
