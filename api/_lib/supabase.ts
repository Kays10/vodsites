// Use dynamic import to avoid top-level module initialization crash
// in Vercel's Node 22 bundled environment.
export async function makeSupabase() {
  const { createClient } = await import('@supabase/supabase-js');
  const url = process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
