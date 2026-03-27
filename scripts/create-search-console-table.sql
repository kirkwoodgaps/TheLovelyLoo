-- Create table for Google Search Console metrics
CREATE TABLE IF NOT EXISTS search_console_metrics (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  query TEXT,
  page TEXT,
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  ctr DECIMAL(5,4) DEFAULT 0,
  position DECIMAL(6,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(date, query, page)
);

-- Create index for faster date-based queries
CREATE INDEX IF NOT EXISTS idx_search_console_date ON search_console_metrics(date);
CREATE INDEX IF NOT EXISTS idx_search_console_query ON search_console_metrics(query);
