import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { createHmac } from 'crypto';

const TOKEN_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7; // 7 days

function readEnv(key: string): string {
  const v = process.env[key];
  return typeof v === 'string' ? v : '';
}

function base64UrlEncode(buf: Buffer | string): string {
  const b = typeof buf === 'string' ? Buffer.from(buf, 'utf8') : buf;
  return b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function signToken(payload: Record<string, unknown>, secret: string): string {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const claims = base64UrlEncode(JSON.stringify({ ...payload, iat: now, exp: now + TOKEN_EXPIRES_IN_SECONDS }));
  const sig = base64UrlEncode(createHmac('sha256', secret).update(`${header}.${claims}`).digest());
  return `${header}.${claims}.${sig}`;
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
  const jwtSecret = readEnv('JWT_SECRET');

  if (!supabaseUrl || !serviceKey || !jwtSecret) {
    return jsonError(res, 500, 'Server config error.');
  }

  // Expect the Supabase access_token from the magic link callback
  let accessToken = '';
  let refreshToken = '';
  try {
    const raw = (req.body ?? {}) as any;
    accessToken = typeof raw.access_token === 'string' ? raw.access_token : '';
    refreshToken = typeof raw.refresh_token === 'string' ? raw.refresh_token : '';
  } catch {
    return jsonError(res, 400, 'Could not read request body.');
  }

  if (!accessToken) {
    return jsonError(res, 400, 'access_token is required.');
  }

  try {
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify the Supabase token and get the user
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      return jsonError(res, 401, 'Invalid or expired magic link. Please request a new one.');
    }

    const email = (user.email || '').toLowerCase();
    if (!email.endsWith('@vodgroup.co.za')) {
      return jsonError(res, 403, 'Access restricted to @vodgroup.co.za accounts only.');
    }

    // Check if user has a password set (has_password flag in metadata)
    const meta: any = user.user_metadata || {};
    const hasPassword = meta.has_password === true;
    const fullName = meta.full_name || meta.name || meta.display_name || null;

    // Issue our own app JWT
    const token = signToken({ userId: user.id, email }, jwtSecret);

    const parts = ['HttpOnly', 'SameSite=Lax', 'Path=/', `Max-Age=${TOKEN_EXPIRES_IN_SECONDS}`];
    if (process.env.NODE_ENV === 'production') parts.push('Secure');
    res.setHeader('Set-Cookie', `auth_token=${token}; ${parts.join('; ')}`);

    return res.status(200).json({
      token,
      needsPassword: !hasPassword,
      user: { id: user.id, email, fullName },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('verify-magic error:', msg);
    return jsonError(res, 500, 'Unexpected server error.');
  }
}
