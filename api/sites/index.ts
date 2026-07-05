
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Supabase credentials not configured' });
  }
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      return res.status(200).json(data);
    } catch (error) {
      console.error('Error fetching sites:', error);
      return res.status(500).json({ error: 'Failed to fetch sites' });
    }
  } else if (req.method === 'POST') {
    try {
      const site = req.body;
      const { data, error } = await supabase
        .from('sites')
        .insert([{
          id: site.id,
          name: site.name,
          group: site.group,
          services: site.services,
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
      
      if (error) throw error;
      return res.status(201).json(data[0]);
    } catch (error) {
      console.error('Error creating site:', error);
      return res.status(500).json({ error: 'Failed to create site' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
