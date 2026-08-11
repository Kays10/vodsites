#!/usr/bin/env node
/**
 * Seed Supabase `sites` table from src/data.ts (initialSites).
 * Idempotent: uses upsert on id.
 *
 * Usage: node scripts/seed-sites.cjs
 * Requires .env.local with SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 */
const { readFileSync, existsSync } = require('fs');
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

function loadInitialSites() {
  const src = readFileSync(resolve(process.cwd(), 'src/data.ts'), 'utf8');
  const start = src.indexOf('export const initialSites');
  if (start === -1) throw new Error('initialSites not found in src/data.ts');
  const arrStart = src.indexOf('[', start);
  let depth = 0;
  let arrEnd = arrStart;
  for (let i = arrStart; i < src.length; i++) {
    if (src[i] === '[') depth++;
    if (src[i] === ']') {
      depth--;
      if (depth === 0) {
        arrEnd = i + 1;
        break;
      }
    }
  }
  // eslint-disable-next-line no-eval
  return eval(`(${src.slice(arrStart, arrEnd)})`);
}

function toDbRow(site) {
  return {
    id: String(site.id),
    name: site.name || '',
    group: site.group || '',
    services: Array.isArray(site.services) ? site.services : [],
    vpn: site.vpn || null,
    pms: site.pms || null,
    hsia: site.hsia || null,
    ip: site.ip || null,
    iptv_system: site.iptvSystem || null,
    iptv_url: site.iptvUrl || null,
    casting_url: site.castingUrl || null,
    headend: site.headend || null,
    headend_url: site.headendUrl || null,
    switches: site.switches || null,
    wlan_controller: site.wlanController || null,
    wlan_controller_url: site.wlanControllerUrl || null,
    notes: site.notes || null,
    other: site.other || null,
  };
}

async function main() {
  loadEnv();
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  const sites = loadInitialSites();
  console.log(`Loaded ${sites.length} sites from src/data.ts`);

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { count: before } = await supabase.from('sites').select('*', { count: 'exact', head: true });
  console.log(`Sites in DB before seed: ${before ?? 0}`);

  const rows = sites.map(toDbRow);
  const BATCH = 50;
  let upserted = 0;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase.from('sites').upsert(batch, { onConflict: 'id' });
    if (error) {
      console.error('Upsert failed:', error.message, error.code);
      process.exit(1);
    }
    upserted += batch.length;
    console.log(`  upserted ${upserted}/${rows.length}`);
  }

  const { count: after } = await supabase.from('sites').select('*', { count: 'exact', head: true });
  console.log(`Done. Sites in DB after seed: ${after ?? upserted}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
