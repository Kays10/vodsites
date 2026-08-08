import { createClient, SupabaseClient } from '@supabase/supabase-js';

export function makeSupabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
