import type { VercelRequest, VercelResponse } from '@vercel/node';
import { makeSupabase } from './_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const sb = await makeSupabase();
    return res.status(200).json({ ok: true, node: process.version, supabase: 'dynamic import OK', client: typeof sb });
  } catch (e: any) {
    return res.status(200).json({ ok: false, node: process.version, error: e?.message || String(e) });
  }
}
