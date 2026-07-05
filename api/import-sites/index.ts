
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initialSites } from '../../src/data';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!process.env.SUPABASE_URL) {
    return res.status(500).json({ error: 'Supabase URL not configured' });
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!serviceKey) {
    return res.status(500).json({ error: 'Supabase service/secret key not configured' });
  }
  const supabase = createClient(
    process.env.SUPABASE_URL,
    serviceKey
  );

  if (req.method === 'POST') {
    try {
      // First, check if sites already exist
      const { data: existingSites, error: checkError } = await supabase
        .from('sites')
        .select('id')
        .limit(1);
      
      if (checkError) throw checkError;
      
      if (existingSites && existingSites.length > 0) {
        return res.status(200).json({ message: 'Sites already exist, skipping import', count: existingSites.length });
      }

      // Import initial sites
      const { data, error } = await supabase
        .from('sites')
        .insert(initialSites.map(site => ({
          id: site.id,
          name: site.name,
          group: site.group,
          services: site.services,
          vpn: site.vpn,
          pms: site.pms,
          hsia: site.hsia,
          ip: site.ip,
          iptv_system: site.iptvSystem,
          iptv_url: site.iptvUrl,
          casting_url: site.castingUrl,
          headend: site.headend,
          headend_url: site.headendUrl,
          switches: site.switches,
          wlan_controller: site.wlanController,
          wlan_controller_url: site.wlanControllerUrl,
          notes: site.notes,
          other: site.other
        })))
        .select();
      
      if (error) throw error;
      
      return res.status(200).json({ message: 'Sites imported successfully', count: data.length, sites: data });
    } catch (error) {
      console.error('Error importing sites:', error);
      return res.status(500).json({ error: 'Failed to import sites' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
