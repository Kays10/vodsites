import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

function readEnv(key: string): string {
  const v = process.env[key];
  return typeof v === 'string' ? v : '';
}

function jsonError(res: VercelResponse, status: number, message: string) {
  return res.status(status).json({ error: message });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return jsonError(res, 405, 'Method Not Allowed');
  }

  const supabaseUrl = readEnv('SUPABASE_URL');
  const anonKey = readEnv('SUPABASE_ANON_KEY') || readEnv('VITE_SUPABASE_ANON_KEY');
  const serviceKey = readEnv('SUPABASE_SERVICE_ROLE_KEY') || readEnv('SUPABASE_SECRET_KEY');

  if (!supabaseUrl || (!anonKey && !serviceKey)) {
    return jsonError(res, 500, 'Server config error.');
  }

  let email = '';
  try {
    const raw = (req.body ?? {}) as any;
    email = typeof raw.email === 'string' ? raw.email.trim().toLowerCase() : '';
  } catch {
    return jsonError(res, 400, 'Could not read request body.');
  }

  if (!email) return jsonError(res, 400, 'Email is required.');
  if (!email.endsWith('@vodgroup.co.za')) {
    return jsonError(res, 403, 'Access restricted to @vodgroup.co.za accounts only.');
  }

  try {
    // Use anon key for resetPasswordForEmail — this is the correct Supabase method
    // that actually sends the password reset email
    const supabase = createClient(supabaseUrl, anonKey || serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://vod-ss-ites.vercel.app',
    });

    if (error) {
      console.error('forgot-password error:', error.message);
      // Still return success to avoid user enumeration
    }

    // Always return success — don't reveal whether email exists
    return res.status(200).json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('forgot-password handler error:', msg);
    return jsonError(res, 500, 'Unexpected server error.');
  }
}
