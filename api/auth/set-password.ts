import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequest } from '../_lib/auth.js';

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

  // Must be logged in via magic link first
  const auth = authenticateRequest(req);
  if (!auth) {
    return jsonError(res, 401, 'Unauthorized. Please log in first.');
  }

  const supabaseUrl = readEnv('SUPABASE_URL');
  const serviceKey = readEnv('SUPABASE_SERVICE_ROLE_KEY') || readEnv('SUPABASE_SECRET_KEY');

  if (!supabaseUrl || !serviceKey) {
    return jsonError(res, 500, 'Server config error.');
  }

  let password = '';
  try {
    const raw = (req.body ?? {}) as any;
    password = typeof raw.password === 'string' ? raw.password : '';
  } catch {
    return jsonError(res, 400, 'Could not read request body.');
  }

  if (!password || password.length < 8) {
    return jsonError(res, 400, 'Password must be at least 8 characters.');
  }

  try {
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Update password in Supabase Auth
    const { error } = await supabase.auth.admin.updateUserById(auth.userId, {
      password,
      user_metadata: { has_password: true },
    });

    if (error) {
      console.error('set-password error:', error.message);
      return jsonError(res, 500, 'Failed to set password. Please try again.');
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('set-password handler error:', msg);
    return jsonError(res, 500, 'Unexpected server error.');
  }
}
