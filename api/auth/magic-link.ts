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

  let email = '';
  try {
    const raw = (req.body ?? {}) as any;
    email = typeof raw.email === 'string' ? raw.email.trim().toLowerCase() : '';
  } catch {
    return jsonError(res, 400, 'Could not read request body.');
  }

  if (!email) {
    return jsonError(res, 400, 'Email is required.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonError(res, 400, 'A valid email address is required.');
  }
  if (!email.endsWith('@vodgroup.co.za')) {
    return jsonError(res, 403, 'Access restricted to @vodgroup.co.za accounts only.');
  }

  try {
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check the user exists in Supabase Auth
    const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const users: any[] = listData?.users || [];
    const existing = users.find((u: any) => (u.email || '').toLowerCase() === email);

    if (!existing) {
      // Return same message to avoid user enumeration
      return res.status(200).json({ success: true });
    }

    // Send magic link via Supabase
    const { error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${readEnv('VITE_APP_URL') || 'https://vod-ss-ites.vercel.app'}/auth/callback`,
      },
    });

    if (error) {
      console.error('Magic link error:', error.message);
      return jsonError(res, 500, 'Failed to send magic link. Please try again.');
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('magic-link handler error:', msg);
    return jsonError(res, 500, 'Unexpected server error.');
  }
}
