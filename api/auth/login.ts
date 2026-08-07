import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyPassword, signToken, hashPassword } from '../../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // #region debug-point A:entry
  (() => { try {
    const fs = require('fs'),
      p = '.dbg/login-not-working.env';
    let u = 'http://127.0.0.1:7777/event',
      s = 'login-not-working';
    try {
      const e = fs.readFileSync(p, 'utf8');
      u = e.match(/DEBUG_SERVER_URL=(.+)/)?.[1] || u;
      s = e.match(/DEBUG_SESSION_ID=(.+)/)?.[1] || s;
    } catch {}
    const bodyEmail = (req.body || {}).email || '';
    const norm = typeof bodyEmail === 'string' ? bodyEmail.trim().toLowerCase() : '';
    fetch(u, {
      method: 'POST',
      body: JSON.stringify({
        sessionId: s,
        runId: 'pre-fix',
        hypothesisId: 'A',
        location: 'api/auth/login.ts:entry',
        msg: '[DEBUG] Login handler invoked',
        data: { method: req.method, emailPresent: !!norm, emailLen: norm.length },
        ts: Date.now(),
      }),
    }).catch(() => {});
    console.error('[DEBUG-LNW-A] entry method=%s email=%s', req.method, norm || '<empty>');
  } catch {} })();
  // #endregion

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  if (!supabaseUrl) {
    return res.status(500).json({ error: 'Supabase URL not configured' });
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!serviceKey) {
    return res.status(500).json({ error: 'Supabase service/secret key not configured' });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const anonKey = process.env.SUPABASE_ANON_KEY;
  const supabaseAuth = anonKey
    ? createClient(supabaseUrl, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : supabaseAdmin;

  try {
    const { email, password } = req.body || {};

    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    let resolvedUser: { id: string; email: string; fullName: string | null } | null = null;

    let localUsers: any[] | null = null;
    let fetchError: any = null;

    try {
      const localRes = await supabaseAdmin
        .from('users')
        .select('id, email, password_hash, full_name, is_active')
        .eq('email', normalizedEmail)
        .limit(1);
      localUsers = localRes.data;
      fetchError = localRes.error;
      if (fetchError) {
        console.error('Login: public.users lookup error:', fetchError);
      }
    } catch (selectErr) {
      fetchError = selectErr;
      console.error('Login: public.users lookup exception:', selectErr);
    }

    // #region debug-point B:local-users-lookup
    (() => { try {
      const fs = require('fs'),
        p = '.dbg/login-not-working.env';
      let u = 'http://127.0.0.1:7777/event',
        s = 'login-not-working';
      try {
        const e = fs.readFileSync(p, 'utf8');
        u = e.match(/DEBUG_SERVER_URL=(.+)/)?.[1] || u;
        s = e.match(/DEBUG_SESSION_ID=(.+)/)?.[1] || s;
      } catch {}
      fetch(u, {
        method: 'POST',
        body: JSON.stringify({
          sessionId: s,
          runId: 'pre-fix',
          hypothesisId: 'B',
          location: 'api/auth/login.ts:after-local-users',
          msg: '[DEBUG] public.users lookup result',
          data: {
            hadFetchError: !!fetchError,
            fetchErrCode: (fetchError || {}).code || null,
            fetchErrMsg: (fetchError || {}).message || null,
            rowCount: localUsers ? localUsers.length : null,
          },
          ts: Date.now(),
        }),
      }).catch(() => {});
      console.error(
        '[DEBUG-LNW-B] local-users lookupError=%s rows=%s',
        fetchError ? 'YES:' + (fetchError.code || fetchError.message || '') : 'no',
        localUsers ? localUsers.length : 'null'
      );
    } catch {} })();
    // #endregion

    if (!fetchError && localUsers && localUsers.length > 0) {
      const localUser = localUsers[0];
      if (localUser.is_active === false) {
        return res.status(403).json({ error: 'Account is disabled. Contact administrator.' });
      }

      const storedHash: string = localUser.password_hash || '';
      const isScryptFormat = /^[0-9a-f]{32}:[0-9a-f]{128}$/i.test(storedHash);
      let passwordValid = false;
      let needsRehash = false;

      if (isScryptFormat) {
        passwordValid = verifyPassword(password, storedHash);
      } else {
        const unprefixed = storedHash.startsWith('PLAINTEXT:')
          ? storedHash.slice('PLAINTEXT:'.length)
          : storedHash;
        if (unprefixed && unprefixed.length > 0 && password === unprefixed) {
          passwordValid = true;
          needsRehash = true;
        }
      }

      // #region debug-point C:custom-hash-check
      (() => { try {
        const fs = require('fs'),
          p = '.dbg/login-not-working.env';
        let u = 'http://127.0.0.1:7777/event',
          s = 'login-not-working';
        try {
          const e = fs.readFileSync(p, 'utf8');
          u = e.match(/DEBUG_SERVER_URL=(.+)/)?.[1] || u;
          s = e.match(/DEBUG_SESSION_ID=(.+)/)?.[1] || s;
        } catch {}
        fetch(u, {
          method: 'POST',
          body: JSON.stringify({
            sessionId: s,
            runId: 'pre-fix',
            hypothesisId: 'C',
            location: 'api/auth/login.ts:custom-hash-check',
            msg: '[DEBUG] Custom password-hash check result',
            data: {
              isScryptFormat,
              passwordValid,
              needsRehash,
              hashEmpty: !storedHash,
            },
            ts: Date.now(),
          }),
        }).catch(() => {});
        console.error(
          '[DEBUG-LNW-C] scrypt=%s passwordValid=%s rehashNeeded=%s hashEmpty=%s',
          isScryptFormat ? 'yes' : 'no',
          passwordValid ? 'yes' : 'no',
          needsRehash ? 'yes' : 'no',
          !storedHash ? 'yes' : 'no'
        );
      } catch {} })();
      // #endregion

      if (passwordValid) {
        if (needsRehash) {
          try {
            const newHash = hashPassword(password);
            const { error: updateError } = await supabaseAdmin
              .from('users')
              .update({ password_hash: newHash })
              .eq('id', localUser.id);
            if (updateError) {
              console.error('Failed to rehash password for user', localUser.id, updateError);
            }
          } catch (rehashErr) {
            console.error('Exception during password rehash:', rehashErr);
          }
        }

        resolvedUser = {
          id: localUser.id,
          email: localUser.email,
          fullName: localUser.full_name,
        };
      } else {
        console.log(
          `Login: local user row found for ${normalizedEmail} but password did not match custom hash; falling back to Supabase Auth.`
        );
      }
    } else {
      console.log(
        `Login: no matching public.users row for ${normalizedEmail}; attempting Supabase Auth sign-in.`
      );
    }

    if (!resolvedUser) {
      // #region debug-point D:before-supabase-auth
      (() => { try {
        const fs = require('fs'),
          p = '.dbg/login-not-working.env';
        let u = 'http://127.0.0.1:7777/event',
          s = 'login-not-working';
        try {
          const e = fs.readFileSync(p, 'utf8');
          u = e.match(/DEBUG_SERVER_URL=(.+)/)?.[1] || u;
          s = e.match(/DEBUG_SESSION_ID=(.+)/)?.[1] || s;
        } catch {}
        fetch(u, {
          method: 'POST',
          body: JSON.stringify({
            sessionId: s,
            runId: 'pre-fix',
            hypothesisId: 'D',
            location: 'api/auth/login.ts:before-supabase-auth',
            msg: '[DEBUG] Falling through to Supabase Auth signInWithPassword',
            data: { usingAnon: supabaseAuth !== supabaseAdmin },
            ts: Date.now(),
          }),
        }).catch(() => {});
        console.error('[DEBUG-LNW-D] calling supabase auth signIn (anonKey=%s)', supabaseAuth !== supabaseAdmin ? 'yes' : 'no');
      } catch {} })();
      // #endregion

      let signInRes = await supabaseAuth.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signInRes.error && supabaseAuth !== supabaseAdmin) {
        const failedCode = (signInRes.error as any)?.code || '';
        console.log(
          `Login: anon-key sign-in failed (${failedCode}); retrying with admin client.`
        );
        signInRes = await supabaseAdmin.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
      }

      // #region debug-point E:after-supabase-auth
      (() => { try {
        const fs = require('fs'),
          p = '.dbg/login-not-working.env';
        let u = 'http://127.0.0.1:7777/event',
          s = 'login-not-working';
        try {
          const e = fs.readFileSync(p, 'utf8');
          u = e.match(/DEBUG_SERVER_URL=(.+)/)?.[1] || u;
          s = e.match(/DEBUG_SESSION_ID=(.+)/)?.[1] || s;
        } catch {}
        fetch(u, {
          method: 'POST',
          body: JSON.stringify({
            sessionId: s,
            runId: 'pre-fix',
            hypothesisId: 'E',
            location: 'api/auth/login.ts:after-supabase-auth',
            msg: '[DEBUG] Supabase Auth signInWithPassword result',
            data: {
              hasError: !!signInRes.error,
              errorCode: (signInRes.error as any)?.code || null,
              errorMessage: (signInRes.error as any)?.message || null,
              hasUser: !!signInRes.data?.user,
              userId: signInRes.data?.user?.id || null,
            },
            ts: Date.now(),
          }),
        }).catch(() => {});
        console.error(
          '[DEBUG-LNW-E] auth-signin err=%s code=%s userFound=%s',
          signInRes.error ? 'YES' : 'no',
          (signInRes.error as any)?.code || '-',
          signInRes.data?.user ? 'yes' : 'no'
        );
      } catch {} })();
      // #endregion

      if (!signInRes.error && signInRes.data && signInRes.data.user) {
        const supabaseUserId = signInRes.data.user.id;
        const supabaseEmail = signInRes.data.user.email || normalizedEmail;
        const meta: any = signInRes.data.user.user_metadata || {};
        const displayName = meta.full_name || meta.name || meta.display_name || null;

        try {
          const { data: existing, error: lookupError } = await supabaseAdmin
            .from('users')
            .select('id, email, full_name, is_active')
            .eq('id', supabaseUserId)
            .limit(1);

          if (!lookupError && existing && existing.length > 0) {
            const existingRow = existing[0];
            if (existingRow.is_active === false) {
              return res.status(403).json({ error: 'Account is disabled. Contact administrator.' });
            }
            resolvedUser = {
              id: existingRow.id,
              email: existingRow.email,
              fullName: existingRow.full_name || displayName,
            };
          } else {
            try {
              await supabaseAdmin.from('users').insert([{
                id: supabaseUserId,
                email: supabaseEmail,
                password_hash: '',
                full_name: displayName,
                is_active: true,
              }]);
            } catch (insertErr) {
              console.error('Warning: could not mirror user to public.users:', insertErr);
            }
            resolvedUser = {
              id: supabaseUserId,
              email: supabaseEmail,
              fullName: displayName,
            };
          }
        } catch (mirrorErr) {
          console.error('Mirror step failed, proceeding with auth user:', mirrorErr);
          resolvedUser = {
            id: supabaseUserId,
            email: supabaseEmail,
            fullName: displayName,
          };
        }
      } else {
        const signInErrCode: string = (signInRes.error as any)?.code || '';
        const signInErrMsg: string = (signInRes.error as any)?.message || '';
        console.error(
          `Login: Supabase Auth signInWithPassword failed for ${normalizedEmail} — code=${signInErrCode} message=${signInErrMsg}`
        );

        if (
          signInErrCode === 'email_not_confirmed' ||
          /email not confirmed/i.test(signInErrMsg)
        ) {
          // #region debug-point F:email-not-confirmed-branch
          (() => { try {
            const fs = require('fs'),
              p = '.dbg/login-not-working.env';
            let u = 'http://127.0.0.1:7777/event',
              s = 'login-not-working';
            try {
              const e = fs.readFileSync(p, 'utf8');
              u = e.match(/DEBUG_SERVER_URL=(.+)/)?.[1] || u;
              s = e.match(/DEBUG_SESSION_ID=(.+)/)?.[1] || s;
            } catch {}
            fetch(u, {
              method: 'POST',
              body: JSON.stringify({
                sessionId: s,
                runId: 'pre-fix',
                hypothesisId: 'E',
                location: 'api/auth/login.ts:email-not-confirmed',
                msg: '[DEBUG] Entering email_not_confirmed auto-confirm branch',
                data: {},
                ts: Date.now(),
              }),
            }).catch(() => {});
            console.error('[DEBUG-LNW-F] entering email-not-confirmed auto-confirm path');
          } catch {} })();
          // #endregion

          console.log(
            `Login: email not confirmed for ${normalizedEmail}; attempting admin auto-confirm.`
          );
          try {
            const list = await supabaseAdmin.auth.admin.listUsers({
              perPage: 1000,
            });
            const match = list?.users?.find(
              (u: any) => (u.email || '').toLowerCase() === normalizedEmail
            );
            if (match) {
              const updated = await supabaseAdmin.auth.admin.updateUserById(match.id, {
                email_confirm: true,
              });
              if (updated.user) {
                let retry = await supabaseAuth.auth.signInWithPassword({
                  email: normalizedEmail,
                  password,
                });
                if (retry.error && supabaseAuth !== supabaseAdmin) {
                  retry = await supabaseAdmin.auth.signInWithPassword({
                    email: normalizedEmail,
                    password,
                  });
                }
                if (!retry.error && retry.data && retry.data.user) {
                  const userId = retry.data.user.id;
                  const userEmail = retry.data.user.email || normalizedEmail;
                  const m: any = retry.data.user.user_metadata || {};
                  const dName = m.full_name || m.name || m.display_name || null;
                  resolvedUser = { id: userId, email: userEmail, fullName: dName };
                  try {
                    const { data: existing } = await supabaseAdmin
                      .from('users')
                      .select('id')
                      .eq('id', userId)
                      .limit(1);
                    if (!existing || existing.length === 0) {
                      await supabaseAdmin.from('users').insert([{
                        id: userId,
                        email: userEmail,
                        password_hash: '',
                        full_name: dName,
                        is_active: true,
                      }]);
                    }
                  } catch {
                    /* ignore */
                  }
                } else {
                  console.error(
                    `Login: retry sign-in after auto-confirm still failed for ${normalizedEmail}`
                  );
                }
              } else {
                console.error(
                  `Login: admin updateUserById did not return user for ${normalizedEmail}`
                );
              }
            } else {
              console.log(
                `Login: admin listUsers did not find ${normalizedEmail} in auth.users`
              );
            }
          } catch (adminErr) {
            console.error('Admin email-confirm recovery failed:', adminErr);
          }
        }

        if (!resolvedUser) {
          // #region debug-point G:401-signin-fail
          (() => { try {
            const fs = require('fs'),
              p = '.dbg/login-not-working.env';
            let u = 'http://127.0.0.1:7777/event',
              s = 'login-not-working';
            try {
              const e = fs.readFileSync(p, 'utf8');
              u = e.match(/DEBUG_SERVER_URL=(.+)/)?.[1] || u;
              s = e.match(/DEBUG_SESSION_ID=(.+)/)?.[1] || s;
            } catch {}
            fetch(u, {
              method: 'POST',
              body: JSON.stringify({
                sessionId: s,
                runId: 'pre-fix',
                hypothesisId: 'G',
                location: 'api/auth/login.ts:401-signin-failed',
                msg: '[DEBUG] 401 being returned after Supabase Auth failed',
                data: { diagCode: 'L401-AUTHFAIL', errCode: signInErrCode, errMsg: signInErrMsg },
                ts: Date.now(),
              }),
            }).catch(() => {});
            console.error(
              '[DEBUG-LNW-G] 401 diagCode=L401-AUTHFAIL err=%s msg=%s',
              signInErrCode,
              signInErrMsg
            );
          } catch {} })();
          // #endregion
          const msg = signInErrMsg || 'Invalid email or password';
          return res.status(401).json({
            error: msg,
            diagnostic_code: 'L401-AUTHFAIL',
          });
        }
      }
    }

    if (!resolvedUser) {
      // #region debug-point H:401-final-gate
      (() => { try {
        const fs = require('fs'),
          p = '.dbg/login-not-working.env';
        let u = 'http://127.0.0.1:7777/event',
          s = 'login-not-working';
        try {
          const e = fs.readFileSync(p, 'utf8');
          u = e.match(/DEBUG_SERVER_URL=(.+)/)?.[1] || u;
          s = e.match(/DEBUG_SESSION_ID=(.+)/)?.[1] || s;
        } catch {}
        fetch(u, {
          method: 'POST',
          body: JSON.stringify({
            sessionId: s,
            runId: 'pre-fix',
            hypothesisId: 'H',
            location: 'api/auth/login.ts:401-final-gate',
            msg: '[DEBUG] 401 at final gate - unresolved user',
            data: { diagCode: 'L401-NOUSER' },
            ts: Date.now(),
          }),
        }).catch(() => {});
        console.error('[DEBUG-LNW-H] 401 diagCode=L401-NOUSER final gate unresolved');
      } catch {} })();
      // #endregion
      console.error(
        `Login: unresolved user at final gate for ${normalizedEmail} — returning 401.`
      );
      return res.status(401).json({
        error: 'Invalid email or password',
        diagnostic_code: 'L401-NOUSER',
      });
    }

    const token = signToken({ userId: resolvedUser.id, email: resolvedUser.email });

    const cookieOptions = [
      `HttpOnly`,
      `SameSite=Lax`,
      `Path=/`,
      `Max-Age=${60 * 60 * 24 * 7}`,
    ];
    if (process.env.NODE_ENV === 'production') {
      cookieOptions.push('Secure');
    }
    res.setHeader('Set-Cookie', `auth_token=${token}; ${cookieOptions.join('; ')}`);

    // #region debug-point I:success
    (() => { try {
      const fs = require('fs'),
        p = '.dbg/login-not-working.env';
      let u = 'http://127.0.0.1:7777/event',
        s = 'login-not-working';
      try {
        const e = fs.readFileSync(p, 'utf8');
        u = e.match(/DEBUG_SERVER_URL=(.+)/)?.[1] || u;
        s = e.match(/DEBUG_SESSION_ID=(.+)/)?.[1] || s;
      } catch {}
      fetch(u, {
        method: 'POST',
        body: JSON.stringify({
          sessionId: s,
          runId: 'pre-fix',
          hypothesisId: 'I',
          location: 'api/auth/login.ts:success-200',
          msg: '[DEBUG] Login success 200',
          data: { userId: resolvedUser.id, email: resolvedUser.email },
          ts: Date.now(),
        }),
      }).catch(() => {});
      console.error(
        '[DEBUG-LNW-I] SUCCESS 200 user=%s id=%s',
        resolvedUser.email,
        resolvedUser.id
      );
    } catch {} })();
    // #endregion

    console.log(`Login: success for ${normalizedEmail} (id=${resolvedUser.id})`);
    return res.status(200).json({
      token,
      user: {
        id: resolvedUser.id,
        email: resolvedUser.email,
        fullName: resolvedUser.fullName,
      },
    });
  } catch (error) {
    // #region debug-point J:unexpected-error
    (() => { try {
      const fs = require('fs'),
        p = '.dbg/login-not-working.env';
      let u = 'http://127.0.0.1:7777/event',
        s = 'login-not-working';
      try {
        const e = fs.readFileSync(p, 'utf8');
        u = e.match(/DEBUG_SERVER_URL=(.+)/)?.[1] || u;
        s = e.match(/DEBUG_SESSION_ID=(.+)/)?.[1] || s;
      } catch {}
      const errMsg = error instanceof Error ? error.message : String(error || '');
      fetch(u, {
        method: 'POST',
        body: JSON.stringify({
          sessionId: s,
          runId: 'pre-fix',
          hypothesisId: 'H',
          location: 'api/auth/login.ts:500-catch',
          msg: '[DEBUG] 500 unexpected error',
          data: { diagCode: 'L500-CATCH', errMsg },
          ts: Date.now(),
        }),
      }).catch(() => {});
      console.error('[DEBUG-LNW-J] 500 diagCode=L500-CATCH msg=%s', errMsg);
    } catch {} })();
    // #endregion
    console.error('Login unexpected error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      diagnostic_code: 'L500-CATCH',
    });
  }
}
