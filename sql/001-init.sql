
-- Create sites table
CREATE TABLE IF NOT EXISTS sites (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  "group" TEXT NOT NULL,
  services JSONB NOT NULL,
  vpn TEXT,
  pms TEXT,
  hsia TEXT,
  ip TEXT,
  iptv_system TEXT,
  iptv_url TEXT,
  casting_url TEXT,
  headend TEXT,
  headend_url TEXT,
  switches TEXT,
  wlan_controller TEXT,
  wlan_controller_url TEXT,
  notes TEXT,
  other TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_sites_updated_at BEFORE UPDATE ON sites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) - optional but recommended
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow full access (you can restrict this later if needed)
CREATE POLICY "Allow full access to sites"
  ON sites
  FOR ALL
  USING (true)
  WITH CHECK (true);
