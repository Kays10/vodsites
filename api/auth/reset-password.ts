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
  const serviceKey = readEnv('SUPABASE_SERVICE_ROLE_KEY') || readEnv('SUPABASE_SECRET_KEY');

  if (!supabaseUrl || !serviceKey) {
    return jsonError(res, 500, 'Server config error.');
  }

  let accessToken = '';
  let password = '';
  try {
    const raw = (req.body ?? {}) as any;
    accessToken = typeof raw.access_token === 'string' ? raw.access_token : '';
    password = typeof raw.password === 'string' ? raw.password : '';
  } catch {
    return jsonError(res, 400, 'Could not read request body.');
  }

  if (!accessToken) return jsonError(res, 400, 'access_token is required.');
  if (!password || password.length < 8) return jsonError(res, 400, 'Password must be at least 8 characters.');

  try {
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify the token and get the user
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    if (userError || !user) {
      return jsonError(res, 401, 'Reset link is invalid or has expired. Please request a new one.');
    }

    // Update the password
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password,
      user_metadata: { has_password: true },
    });

    if (updateError) {
      console.error('reset-password update error:', updateError.message);
      return jsonError(res, 500, 'Failed to update password. Please try again.');
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('reset-password error:', msg);
    return jsonError(res, 500, 'Unexpected server error.');
  }
}
