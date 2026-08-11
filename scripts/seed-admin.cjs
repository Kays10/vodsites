#!/usr/bin/env node
/**
 * Create or reset a dev admin user in Supabase Auth + public.users.
 *
 * Usage: node scripts/seed-admin.cjs [email] [password]
 * Defaults: admin@vodgroup.com / VodAdmin2024!
 */
const { existsSync, readFileSync } = require('fs');
const { resolve } = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    const p = resolve(process.cwd(), file);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
      }
    }
  }
}

async function main() {
  loadEnv();
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const email = (process.argv[2] || 'admin@vodgroup.com').trim().toLowerCase();
  const password = process.argv[3] || 'VodAdmin2024!';

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const existing = (list?.users || []).find((u) => (u.email || '').toLowerCase() === email);

  let userId;
  if (existing) {
    userId = existing.id;
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
    });
    if (error) {
      console.error('Failed to update user:', error.message);
      process.exit(1);
    }
    console.log(`Updated existing auth user: ${email}`);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'Admin' },
    });
    if (error || !data.user) {
      console.error('Failed to create user:', error?.message);
      process.exit(1);
    }
    userId = data.user.id;
    console.log(`Created auth user: ${email}`);
  }

  const { error: upsertErr } = await supabase.from('users').upsert(
    {
      id: userId,
      email,
      password_hash: '',
      full_name: 'Admin',
      is_active: true,
    },
    { onConflict: 'id' }
  );
  if (upsertErr) {
    console.error('Warning: public.users upsert failed:', upsertErr.message);
  } else {
    console.log('Mirrored to public.users');
  }

  console.log(`\nLogin credentials:\n  Email:    ${email}\n  Password: ${password}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
