import { createClient, SupabaseClient } from '@supabase/supabase-js';

// @supabase/supabase-js v2.110+ requires native WebSocket (Node 22+).
// Vercel functions may run on Node 20. Polyfill with the 'ws' package
// (already a transitive dependency) so createClient works on any Node version.
if (typeof globalThis.WebSocket === 'undefined') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const WS = require('ws') as typeof WebSocket;
    (globalThis as any).WebSocket = WS;
  } catch {
    // 'ws' not available — will work on Node 22+ without it
  }
}

export function makeSupabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
