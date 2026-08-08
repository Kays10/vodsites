
-- IDEMPOTENT PRODUCTION FIX FOR users TABLE — RUN THIS ONCE IN PRODUCTION
-- Safe to run even if some fixes already applied. Paste into Supabase → SQL Editor → New Query → Run.

-- Fix 1: Ensure password_hash has DEFAULT '' (so Supabase Auth mirrored users insert successfully
-- with empty password_hash, even if table was originally created without this default).
ALTER TABLE IF EXISTS users ALTER COLUMN password_hash SET DEFAULT '';
ALTER TABLE IF EXISTS users ALTER COLUMN password_hash SET NOT NULL;

-- Fix 2: Ensure updated_at trigger exists (was added to 002-users-auth.sql after first drafts).
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Fix 3: Match sites-table pattern — DISABLE ROW LEVEL SECURITY on users.
-- Administrative operations use service_role which bypasses RLS anyway; disabling eliminates surprises.
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;

-- Fix 4: Mirror the existing Supabase Auth admin user into public.users.
-- UID 8679fd9e-f060-440a-9aaf-e1e8a33af887 = kudzayi.matsika@vodgroup.co.za
-- (visible in the Authentication → Users dashboard screenshot).
INSERT INTO users (id, email, password_hash, full_name, is_active)
VALUES (
  '8679fd9e-f060-440a-9aaf-e1e8a33af887'::uuid,
  'kudzayi.matsika@vodgroup.co.za',
  '',
  'Admin',
  true
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  password_hash = CASE WHEN EXCLUDED.password_hash <> '' THEN EXCLUDED.password_hash ELSE users.password_hash END,
  full_name = COALESCE(users.full_name, EXCLUDED.full_name),
  is_active = true;
