import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomBytes, scryptSync, timingSafeEqual, createHmac } from 'crypto';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createClient } = require('@supabase/supabase-js');

// ============================================================================
// Self-contained auth helpers (no imports from _lib/auth, no jsonwebtoken).
// Everything here uses Node's built-in `crypto` module — guaranteed available.
// ============================================================================

const SALT_ROUNDS = 16;
const TOKEN_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7; // 7 days

function base64UrlEncode(buf: Buffer | string): string {
  const b = typeof buf === 'string' ? Buffer.from(buf, 'utf8') : buf;
  return b
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function readEnv(key: string): string {
  const v = process.env[key];
  return typeof v === 'string' ? v : '';
}

function hashPassword(password: string): string {
  const salt = randomBytes(SALT_ROUNDS).toString('hex');
  const derivedKey = scryptSync(password, salt, 64) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return false;
    const derivedKey = scryptSync(password, salt, 64) as Buffer;
    const keyBuffer = Buffer.from(key, 'hex');
    if (derivedKey.length !== keyBuffer.length) return false;
    return timingSafeEqual(derivedKey, keyBuffer);
  } catch {
    return false;
  }
}

function signToken(payload: Record<string, unknown>, jwtSecret: string): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    ...payload,
    iat: now,
    exp: now + TOKEN_EXPIRES_IN_SECONDS,
  };
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const claimsB64 = base64UrlEncode(JSON.stringify(claims));
  const signingInput = `${headerB64}.${claimsB64}`;
  const signature = createHmac('sha256', jwtSecret).update(signingInput).digest();
  const sigB64 = base64UrlEncode(signature);
  return `${signingInput}.${sigB64}`;
}

function jsonError(res: VercelResponse, status: number, message: string, diagnosticCode: string, extra?: Record<string, unknown>) {
  const payload: Record<string, unknown> = {
    error: message,
    diagnostic_code: diagnosticCode,
  };
  if (extra && typeof extra === 'object') {
    Object.assign(payload, extra);
  }
  return res.status(status).json(payload);
}

// ============================================================================
// Handler
// ============================================================================
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Outer safety — any exception, even during argument extraction, becomes a JSON error.
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return jsonError(res, 405, `Method ${String(req.method)} Not Allowed`, 'L405-METHOD');
    }

    // 1. Required env vars
    const supabaseUrl = readEnv('SUPABASE_URL');
    const serviceKey = readEnv('SUPABASE_SERVICE_ROLE_KEY') || readEnv('SUPABASE_SECRET_KEY');
    const jwtSecret = readEnv('JWT_SECRET');

    if (!supabaseUrl || supabaseUrl.startsWith('__FILL') || !supabaseUrl.trim()) {
      return jsonError(res, 500, 'Server config error: SUPABASE_URL missing.', 'L500-NO-SB-URL');
    }
    if (!serviceKey || serviceKey.startsWith('__FILL') || !serviceKey.trim()) {
      return jsonError(res, 500, 'Server config error: SUPABASE_SERVICE_ROLE_KEY missing.', 'L500-NO-SB-KEY');
    }
    if (!jwtSecret || jwtSecret.startsWith('change-me') || !jwtSecret.trim()) {
      return jsonError(res, 500, 'Server config error: JWT_SECRET missing.', 'L500-NO-JWT-SECRET');
    }

    // 2. Supabase client init (its own try/catch)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let supabaseAdmin: any;
    try {
      supabaseAdmin = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
    } catch (e) {
      const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
      return jsonError(res, 500, `Failed to init Supabase: ${msg}`, 'L500-SB-INIT', { raw: msg });
    }

    // 3. Request body / creds
    let email = '';
    let password = '';
    try {
      const raw = (req.body ?? {}) as any;
      email = typeof raw.email === 'string' ? raw.email : '';
      password = typeof raw.password === 'string' ? raw.password : '';
    } catch (e) {
      const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
      return jsonError(res, 400, `Could not read body: ${msg}`, 'L400-BODY');
    }
    if (!email || !password) {
      return jsonError(res, 400, 'Email and password are required.', 'L400-CREDS');
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return jsonError(res, 400, 'A valid email address is required.', 'L400-EMAIL-FMT');
    }

    let resolvedUser: { id: string; email: string; fullName: string | null } | null = null;
    let lastSbCode: string | null = null;
    let lastSbMsg: string | null = null;

    // ========================================================================
    // STEP 1 — Supabase Auth signInWithPassword (first priority)
    // ========================================================================
    try {
      const signIn = await supabaseAdmin.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (!signIn.error && signIn.data && signIn.data.user) {
        const u = signIn.data.user;
        const meta: any = u.user_metadata || {};
        const displayName = meta.full_name || meta.name || meta.display_name || null;
        resolvedUser = {
          id: u.id,
          email: u.email || normalizedEmail,
          fullName: displayName,
        };
        // (Non-fatal mirror to public.users)
        try {
          const usersTable = supabaseAdmin.from('users' as any);
          const { data: existing, error: lookupErr } = await (usersTable as any)
            .select('id, email, full_name, is_active')
            .eq('id', u.id)
            .limit(1);
          if (!lookupErr && existing && existing.length > 0) {
            const row = (existing as any[])[0];
            if (row.is_active === false) {
              return jsonError(res, 403, 'Account is disabled. Contact administrator.', 'L403-DISABLED');
            }
            if (row.full_name) {
              resolvedUser.fullName = row.full_name;
            }
          } else {
            (supabaseAdmin.from('users' as any) as any).insert([
              {
                id: u.id,
                email: resolvedUser.email,
                password_hash: '',
                full_name: displayName,
                is_active: true,
              },
            ]).then(() => {/* ignore */}).catch(() => {/* ignore */});
          }
        } catch {
          /* mirror failure is non-fatal */
        }
      } else if (signIn.error) {
        lastSbCode = (signIn.error as any)?.code || '';
        lastSbMsg = signIn.error.message || '';
      }
    } catch (e) {
      const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
      // If Supabase itself throws, that's a 500 with details — not a generic crash.
      return jsonError(res, 500, `Supabase Auth call failed: ${msg}`, 'L500-SB-SIGNIN-THROW', { raw: msg });
    }

    // ========================================================================
    // STEP 2 — Auto-confirm recovery (email_not_confirmed)
    // ========================================================================
    if (!resolvedUser && (lastSbCode === 'email_not_confirmed' || /email not confirmed/i.test(lastSbMsg || ''))) {
      try {
        const list = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
        const usersList: any[] = (list as any)?.data?.users || (list as any)?.users || [];
        const match = usersList.find((u: any) => (u.email || '').toLowerCase() === normalizedEmail);
        if (match) {
          await supabaseAdmin.auth.admin.updateUserById(match.id, { email_confirm: true });
          const retry = await supabaseAdmin.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          });
          if (!retry.error && retry.data && retry.data.user) {
            const u = retry.data.user;
            const meta: any = u.user_metadata || {};
            resolvedUser = {
              id: u.id,
              email: u.email || normalizedEmail,
              fullName: meta.full_name || meta.name || meta.display_name || null,
            };
          } else if (retry.error) {
            lastSbCode = (retry.error as any)?.code || '';
            lastSbMsg = retry.error.message || '';
          }
        }
      } catch {
        /* recovery failure is non-fatal; fall through to local users step */
      }
    }

    // ========================================================================
    // STEP 3 — Fallback: local public.users (users created in-app Users tab)
    // ========================================================================
    if (!resolvedUser) {
      try {
        const { data: rows, error: qErr } = await (supabaseAdmin.from('users' as any) as any)
          .select('id, email, password_hash, full_name, is_active')
          .eq('email', normalizedEmail)
          .limit(1);

        if (!qErr && rows && rows.length > 0) {
          const row = (rows as any[])[0];
          if (row.is_active === false) {
            return jsonError(res, 403, 'Account is disabled. Contact administrator.', 'L403-LOCAL-DISABLED');
          }
          const storedHash: string = row.password_hash || '';
          const isScrypt = /^[0-9a-f]{32}:[0-9a-f]{128}$/i.test(storedHash);
          let pwOk = false;
          let rehash = false;
          if (isScrypt) {
            pwOk = verifyPassword(password, storedHash);
          } else {
            const unprefixed = storedHash.startsWith('PLAINTEXT:')
              ? storedHash.slice('PLAINTEXT:'.length)
              : storedHash;
            if (unprefixed && password === unprefixed) {
              pwOk = true;
              rehash = true;
            }
          }
          if (pwOk) {
            resolvedUser = {
              id: row.id,
              email: row.email,
              fullName: row.full_name,
            };
            if (rehash) {
              try {
                const newHash = hashPassword(password);
                await (supabaseAdmin.from('users' as any) as any).update({ password_hash: newHash }).eq('id', row.id);
              } catch { /* ignore rehash failure */ }
            }
          }
        }
      } catch {
        /* local lookup failure is non-fatal */
      }
    }

    // ========================================================================
    // Final gate
    // ========================================================================
    if (!resolvedUser) {
      const msg =
        lastSbMsg && lastSbCode
          ? `${lastSbMsg} (code: ${lastSbCode})`
          : lastSbMsg || 'Invalid email or password.';
      return jsonError(res, 401, msg, 'L401-NO-USER', {
        supabase: { code: lastSbCode },
      });
    }

    // ========================================================================
    // Issue token + respond
    // ========================================================================
    let token: string;
    try {
      token = signToken(
        { userId: resolvedUser.id, email: resolvedUser.email },
        jwtSecret
      );
    } catch (e) {
      const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
      return jsonError(res, 500, `Failed to sign token: ${msg}`, 'L500-TOKEN', { raw: msg });
    }

    try {
      const parts = ['HttpOnly', 'SameSite=Lax', 'Path=/', `Max-Age=${TOKEN_EXPIRES_IN_SECONDS}`];
      if (process.env.NODE_ENV === 'production') parts.push('Secure');
      res.setHeader('Set-Cookie', `auth_token=${token}; ${parts.join('; ')}`);
    } catch {
      /* cookie write is nice-to-have; body token is sufficient */
    }

    return res.status(200).json({
      token,
      user: {
        id: resolvedUser.id,
        email: resolvedUser.email,
        fullName: resolvedUser.fullName,
      },
    });
  } catch (outer) {
    const msg =
      outer instanceof Error
        ? `${outer.name}: ${outer.message}`
        : String(outer || '');
    return jsonError(res, 500, `Unexpected server error: ${msg}`, 'L500-OUTER', { raw: msg });
  }
}
