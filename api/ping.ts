import type { VercelRequest, VercelResponse } from '@vercel/node';
// Static import — same as what sites/index.ts does
import { makeSupabase } from './_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const sb = makeSupabase();
    return res.status(200).json({
      ok: true,
      node: process.version,
      supabase: 'static import + makeSupabase OK',
      client: typeof sb
    });
  } catch (e: any) {
    return res.status(200).json({
      ok: false,
      node: process.version,
      error: e?.message || String(e)
    });
  }
}
