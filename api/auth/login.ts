import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyPassword, signToken, hashPassword } from '../../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  if (!supabaseUrl || supabaseUrl.startsWith('__FILL') || supabaseUrl.trim() === '') {
    const err =
      'SUPABASE_URL is not configured (empty or placeholder). Set it in Vercel Project -> Settings -> Environment Variables, then redeploy.';
    console.error('[LOGIN][FATAL]', err, 'value=', JSON.stringify(supabaseUrl));
    return res
      .status(500)
      .json({ error: 'Server configuration error. Contact administrator.', diagnostic_code: 'L500-NO-SUPABASE-URL' });
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!serviceKey || serviceKey.startsWith('__FILL') || serviceKey.trim() === '') {
    const err =
      'SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) is not configured. Set it in Vercel Project -> Settings -> Environment Variables, then redeploy.';
    console.error('[LOGIN][FATAL]', err);
    return res.status(500).json({
      error: 'Server configuration error. Contact administrator.',
      diagnostic_code: 'L500-NO-SUPABASE-SERVICE-KEY',
    });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.startsWith('change-me') || jwtSecret.trim() === '') {
    console.error('[LOGIN][FATAL] JWT_SECRET is not configured (empty or still default placeholder).');
    return res.status(500).json({
      error: 'Server configuration error. Contact administrator.',
      diagnostic_code: 'L500-NO-JWT-SECRET',
    });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const anonKey = process.env.SUPABASE_ANON_KEY;
  const supabaseAuth =
    anonKey && !anonKey.startsWith('__FILL') && anonKey.trim() !== ''
      ? createClient(supabaseUrl, anonKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
      : supabaseAdmin;

  try {
    const { email, password } = req.body || {};

    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password are required.' });
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
        console.error(
          `[LOGIN][public.users lookup ERROR] email=${normalizedEmail} code=${JSON.stringify(
            (fetchError as any)?.code ?? null
          )} message=${JSON.stringify((fetchError as any)?.message ?? null)} details=${JSON.stringify(
            (fetchError as any)?.details ?? null
          )} hint=${JSON.stringify((fetchError as any)?.hint ?? null)}`
        );
      }
    } catch (selectErr) {
      fetchError = selectErr;
      console.error(
        `[LOGIN][public.users lookup EXCEPTION] email=${normalizedEmail} err=${
          selectErr instanceof Error ? `${selectErr.name}: ${selectErr.message}` : String(selectErr)
        }`
      );
    }

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

      if (passwordValid) {
        if (needsRehash) {
          try {
            const newHash = hashPassword(password);
            const { error: updateError } = await supabaseAdmin
              .from('users')
              .update({ password_hash: newHash })
              .eq('id', localUser.id);
            if (updateError) {
              console.error(
                `[LOGIN][WARN] Failed to rehash password for user id=${localUser.id} code=${JSON.stringify(
                  (updateError as any)?.code ?? null
                )} message=${JSON.stringify((updateError as any)?.message ?? null)}`
              );
            }
          } catch (rehashErr) {
            console.error(
              '[LOGIN][WARN] Exception during password rehash:',
              rehashErr instanceof Error ? `${rehashErr.name}: ${rehashErr.message}` : String(rehashErr)
            );
          }
        }

        resolvedUser = {
          id: localUser.id,
          email: localUser.email,
          fullName: localUser.full_name,
        };
      } else {
        console.log(
          `[LOGIN] public.users row found for ${normalizedEmail} but password did not match local hash; falling back to Supabase Auth.`
        );
      }
    } else {
      console.log(
        `[LOGIN] No matching public.users row for ${normalizedEmail} (fetchError=${
          fetchError ? 'YES' : 'no'
        }); attempting Supabase Auth sign-in.`
      );
    }

    if (!resolvedUser) {
      console.log(
        `[LOGIN] Calling supabase.auth.signInWithPassword for ${normalizedEmail} (using ${
          supabaseAuth !== supabaseAdmin ? 'anon key client' : 'service role client as fallback'
        })`
      );

      let signInRes = await supabaseAuth.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signInRes.error && supabaseAuth !== supabaseAdmin) {
        const failedCode = (signInRes.error as any)?.code || '';
        const failedMsg = (signInRes.error as any)?.message || '';
        console.log(
          `[LOGIN] Anon-key signInWithPassword failed for ${normalizedEmail}: code=${JSON.stringify(
            failedCode
          )} message=${JSON.stringify(failedMsg)}. Retrying with admin client.`
        );
        signInRes = await supabaseAdmin.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
      }

      if (signInRes.error) {
        const sbCode: string = (signInRes.error as any)?.code ?? '';
        const sbMessage: string = signInRes.error.message ?? '';
        const sbStatus: number | undefined = (signInRes.error as any)?.status as any;
        console.error(
          `[LOGIN][Supabase Auth signInWithPassword FAILED] email=${normalizedEmail} code=${JSON.stringify(
            sbCode
          )} status=${JSON.stringify(sbStatus)} message=${JSON.stringify(sbMessage)}`
        );

        if (sbCode === 'email_not_confirmed' || /email not confirmed/i.test(sbMessage)) {
          console.log(
            `[LOGIN] email_not_confirmed detected for ${normalizedEmail}. Attempting admin auto-confirm (requires SERVICE_ROLE_KEY).`
          );
          try {
            const list = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
            const userList: any[] =
              (list as any)?.data?.users || (list as any)?.users || [];
            const match = userList.find(
              (u: any) => (u.email || '').toLowerCase() === normalizedEmail
            );
            if (match) {
              const updated = await supabaseAdmin.auth.admin.updateUserById(match.id, {
                emailConfirm: true,
              });
              if (updated.user) {
                console.log(
                  `[LOGIN] Auto-confirmed email for user id=${match.id}. Retrying signInWithPassword.`
                );
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
                      await supabaseAdmin.from('users').insert([
                        {
                          id: userId,
                          email: userEmail,
                          password_hash: '',
                          full_name: dName,
                          is_active: true,
                        },
                      ]);
                    }
                  } catch {
                    /* ignore mirror step failure */
                  }
                } else {
                  const rCode = (retry.error as any)?.code ?? '';
                  const rMsg = retry.error?.message ?? '';
                  console.error(
                    `[LOGIN] After auto-confirm retry, signIn still failed for ${normalizedEmail}. code=${JSON.stringify(
                      rCode
                    )} message=${JSON.stringify(rMsg)}`
                  );
                }
              } else {
                console.error(
                  `[LOGIN] supabaseAdmin.auth.admin.updateUserById returned no user for ${normalizedEmail}.`
                );
              }
            } else {
              console.log(
                `[LOGIN] admin.listUsers did not find ${normalizedEmail} in auth.users table (only in public.users? check dashboards).`
              );
            }
          } catch (adminErr) {
            console.error(
              `[LOGIN] Admin auto-confirm recovery threw for ${normalizedEmail}:`,
              adminErr instanceof Error ? `${adminErr.name}: ${adminErr.message}` : String(adminErr)
            );
          }
        }

        if (!resolvedUser) {
          return res.status(401).json({
            error: sbMessage || 'Invalid email or password.',
            diagnostic_code: 'L401-SUPABASE-AUTH',
            supabase: {
              code: sbCode || null,
              status: sbStatus || null,
            },
          });
        }
      }

      if (!resolvedUser && signInRes.data && signInRes.data.user) {
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
              return res
                .status(403)
                .json({ error: 'Account is disabled. Contact administrator.' });
            }
            resolvedUser = {
              id: existingRow.id,
              email: existingRow.email,
              fullName: existingRow.full_name || displayName,
            };
          } else {
            try {
              await supabaseAdmin.from('users').insert([
                {
                  id: supabaseUserId,
                  email: supabaseEmail,
                  password_hash: '',
                  full_name: displayName,
                  is_active: true,
                },
              ]);
            } catch (insertErr) {
              console.error(
                '[LOGIN][WARN] Could not mirror auth user into public.users:',
                insertErr instanceof Error ? `${insertErr.name}: ${insertErr.message}` : String(insertErr)
              );
            }
            resolvedUser = {
              id: supabaseUserId,
              email: supabaseEmail,
              fullName: displayName,
            };
          }
        } catch (mirrorErr) {
          console.error(
            '[LOGIN][WARN] Mirror step failed, proceeding with raw auth user:',
            mirrorErr instanceof Error ? `${mirrorErr.name}: ${mirrorErr.message}` : String(mirrorErr)
          );
          resolvedUser = {
            id: supabaseUserId,
            email: supabaseEmail,
            fullName: displayName,
          };
        }
      }
    }

    if (!resolvedUser) {
      console.error(
        `[LOGIN] Unresolved user at final gate for ${normalizedEmail} -> 401.`
      );
      return res.status(401).json({
        error: 'Invalid email or password.',
        diagnostic_code: 'L401-NO-RESOLVED-USER',
      });
    }

    const token = signToken({ userId: resolvedUser.id, email: resolvedUser.email });

    const cookieOptions = [`HttpOnly`, `SameSite=Lax`, `Path=/`, `Max-Age=${60 * 60 * 24 * 7}`];
    if (process.env.NODE_ENV === 'production') {
      cookieOptions.push('Secure');
    }
    res.setHeader('Set-Cookie', `auth_token=${token}; ${cookieOptions.join('; ')}`);

    console.log(`[LOGIN] SUCCESS for ${normalizedEmail} (id=${resolvedUser.id})`);
    return res.status(200).json({
      token,
      user: {
        id: resolvedUser.id,
        email: resolvedUser.email,
        fullName: resolvedUser.fullName,
      },
    });
  } catch (error) {
    const errMsg =
      error instanceof Error ? `${error.name}: ${error.message}` : String(error || '');
    console.error(`[LOGIN][500] Unexpected handler error for email=${(req.body as any)?.email ?? '<unknown>'}:`, errMsg);
    return res.status(500).json({
      error: 'Internal server error.',
      diagnostic_code: 'L500-CATCH-ALL',
    });
  }
}
