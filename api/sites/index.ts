
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateRequest } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = authenticateRequest(req);
  if (!auth) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }

  if (!process.env.SUPABASE_URL) {
    return res.status(500).json({ error: 'Supabase URL not configured' });
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!serviceKey) {
    return res.status(500).json({ error: 'Supabase service/secret key not configured' });
  }
  const supabase = createClient(process.env.SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) {
        console.error('Supabase GET error:', error);
        return res.status(500).json({ error: error.message, code: error.code, details: error.details });
      }
      return res.status(200).json(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Error fetching sites:', msg);
      return res.status(500).json({ error: msg });
    }
  } else if (req.method === 'POST') {
    try {
      const site = req.body;

      if (!site || typeof site !== 'object') {
        return res.status(400).json({ error: 'Request body is missing or invalid.' });
      }
      if (!site.name || typeof site.name !== 'string' || !site.name.trim()) {
        return res.status(400).json({ error: 'Site name is required.' });
      }

      const { data, error } = await supabase
        .from('sites')
        .insert([{
          id: site.id || undefined,
          name: site.name.trim(),
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
          other: site.other || null
        }])
        .select();
      
      if (error) {
        console.error('Supabase INSERT error:', error);
        return res.status(500).json({ error: error.message, code: error.code, details: error.details });
      }
      return res.status(201).json(data[0]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Error creating site:', msg);
      return res.status(500).json({ error: msg });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
