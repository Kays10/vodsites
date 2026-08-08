
-- ============================================================
-- VOD SSites — FULL PRODUCTION MIGRATION (001 + 002 + 003)
-- IDEMPOTENT: Run as many times as you want; safe on re-runs.
-- Paste entire block into Supabase → SQL Editor → New Query → Run
-- ============================================================

-- ---------- SHARED UTIL ----------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;

-- ============================================================
-- 1. SITES TABLE  (from 001-init.sql + RLS disabled per conventions)
-- ============================================================
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

DROP TRIGGER IF EXISTS update_sites_updated_at ON sites;
CREATE TRIGGER update_sites_updated_at BEFORE UPDATE ON sites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: DISABLED (convention from project_memory — service role bypasses anyway but disabled for zero surprises)
ALTER TABLE IF EXISTS sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sites DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. USERS TABLE  (from 002-users-auth.sql)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL DEFAULT '',
  full_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: DISABLED (matching sites table pattern)
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. USERS TABLE PRODUCTION FIXES  (from 003-fix-users-table.sql)
--    Guarantee defaults even if table pre-existed without them
-- ============================================================
ALTER TABLE IF EXISTS users ALTER COLUMN password_hash SET DEFAULT '';
ALTER TABLE IF EXISTS users ALTER COLUMN password_hash SET NOT NULL;
