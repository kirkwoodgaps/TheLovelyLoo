-- Create tables for storing imported data from Google Ads Call Details and 17hats contacts

-- Google Ads Call Records (imported from CSV export)
CREATE TABLE IF NOT EXISTS google_ads_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_time TIMESTAMPTZ NOT NULL,
  duration_seconds INTEGER NOT NULL,
  caller_country_code TEXT,
  caller_area_code TEXT,
  caller_phone_number TEXT,
  recording_url TEXT,
  status TEXT NOT NULL,
  call_source TEXT,
  call_type TEXT,
  campaign TEXT,
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate imports
  UNIQUE(start_time, caller_phone_number, campaign)
);

-- 17hats Contacts (imported from CSV export)
CREATE TABLE IF NOT EXISTS contacts_17hats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  source TEXT,
  tags TEXT,
  notes TEXT,
  created_date TIMESTAMPTZ,
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate imports by email
  UNIQUE(email)
);

-- Create indexes for faster querying
CREATE INDEX IF NOT EXISTS idx_google_ads_calls_start_time ON google_ads_calls(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_google_ads_calls_campaign ON google_ads_calls(campaign);
CREATE INDEX IF NOT EXISTS idx_google_ads_calls_phone ON google_ads_calls(caller_phone_number);

CREATE INDEX IF NOT EXISTS idx_contacts_17hats_email ON contacts_17hats(email);
CREATE INDEX IF NOT EXISTS idx_contacts_17hats_phone ON contacts_17hats(phone);
CREATE INDEX IF NOT EXISTS idx_contacts_17hats_created ON contacts_17hats(created_date DESC);

-- No RLS needed for this dashboard app (single user/admin access)
-- If you need multi-user access later, enable RLS and add policies
