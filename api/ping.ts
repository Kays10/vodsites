import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Test 1: can we import supabase?
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const c = createClient('https://x.supabase.co', 'fake', {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    return res.status(200).json({
      ok: true,
      node: process.version,
      supabase: 'import OK',
      client: typeof c
    });
  } catch (e: any) {
    return res.status(200).json({
      ok: false,
      node: process.version,
      supabase_error: e?.message || String(e)
    });
  }
}
