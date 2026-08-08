import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Dynamic import — no static import of supabase-js
    const { createClient } = await import('@supabase/supabase-js');
    const sb = createClient('https://x.supabase.co', 'fake', { auth: { autoRefreshToken: false, persistSession: false } });
    return res.status(200).json({ ok: true, node: process.version, supabase: 'dynamic import OK', client: typeof sb });
  } catch (e: any) {
    return res.status(200).json({ ok: false, node: process.version, error: e?.message || String(e) });
  }
}
