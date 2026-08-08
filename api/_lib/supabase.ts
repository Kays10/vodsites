import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase admin client with Realtime disabled.
 * Realtime requires a native WebSocket (Node 22+), but these API routes
 * only use the REST API, so we disable it entirely for compatibility.
 */
export function makeSupabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: { transport: class NoopWS {
      static CONNECTING = 0; static OPEN = 1; static CLOSING = 2; static CLOSED = 3;
      readyState = 3; // CLOSED — never actually connects
      addEventListener() {}
      removeEventListener() {}
      close() {}
      send() {}
    } as any },
  });
}
