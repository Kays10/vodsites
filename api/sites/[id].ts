import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateRequest } from '../_lib/auth';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const auth = authenticateRequest(req);
    if (!auth) return res.status(401).json({ error: 'Unauthorized. Please log in.' });

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
    if (!url) return res.status(500).json({ error: 'Supabase URL not configured' });
    if (!key) return res.status(500).json({ error: 'Supabase key not configured' });

    const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    const { id } = req.query;

    if (req.method === 'PUT') {
      const site = req.body;
      const { data, error } = await supabase.from('sites').update({
        name: site.name, group: site.group || '',
        services: Array.isArray(site.services) ? site.services : [],
        vpn: site.vpn || null, pms: site.pms || null, hsia: site.hsia || null,
        ip: site.ip || null, iptv_system: site.iptvSystem || null, iptv_url: site.iptvUrl || null,
        casting_url: site.castingUrl || null, headend: site.headend || null,
        headend_url: site.headendUrl || null, switches: site.switches || null,
        wlan_controller: site.wlanController || null, wlan_controller_url: site.wlanControllerUrl || null,
        notes: site.notes || null, other: site.other || null,
      }).eq('id', id).select();

      if (error) return res.status(500).json({ error: error.message, code: error.code });
      if (!data || data.length === 0) return res.status(404).json({ error: 'Site not found' });
      return res.status(200).json(data[0]);

    } else if (req.method === 'DELETE') {
      const { data, error } = await supabase.from('sites').delete().eq('id', id).select();
      if (error) return res.status(500).json({ error: error.message });
      if (!data || data.length === 0) return res.status(404).json({ error: 'Site not found' });
      return res.status(204).end();

    } else {
      res.setHeader('Allow', ['PUT', 'DELETE']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (err) {
    const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    return res.status(500).json({ error: msg });
  }
}
