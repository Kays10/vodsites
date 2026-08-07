
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateRequest } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = authenticateRequest(req);
  if (!auth) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }

  console.log('=== api/sites/[id].ts HIT! ===');
  console.log('req.method:', req.method);
  console.log('req.url:', req.url);
  console.log('req.query:', req.query);
  if (!process.env.SUPABASE_URL) {
    console.error('❌ No SUPABASE_URL');
    return res.status(500).json({ error: 'Supabase URL not configured' });
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!serviceKey) {
    console.error('❌ No service/secret key');
    return res.status(500).json({ error: 'Supabase service/secret key not configured' });
  }
  console.log('✅ Credentials OK');
  const supabase = createClient(
    process.env.SUPABASE_URL,
    serviceKey
  );
  const { id } = req.query;
  console.log('Site ID:', id);

  if (req.method === 'PUT') {
    try {
      const site = req.body;
      console.log('Updating site with data:', site);
      const { data, error } = await supabase
        .from('sites')
        .update({
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
        })
        .eq('id', id)
        .select();
      
      if (error) {
        console.error('❌ Supabase update error:', error);
        throw error;
      }
      console.log('✅ Supabase update OK:', data);
      if (data.length === 0) {
        return res.status(404).json({ error: 'Site not found' });
      }
      return res.status(200).json(data[0]);
    } catch (error) {
      console.error('Error updating site:', error);
      return res.status(500).json({ error: 'Failed to update site' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { data, error } = await supabase
        .from('sites')
        .delete()
        .eq('id', id)
        .select();
      
      if (error) throw error;
      if (data.length === 0) {
        return res.status(404).json({ error: 'Site not found' });
      }
      return res.status(204).send();
    } catch (error) {
      console.error('Error deleting site:', error);
      return res.status(500).json({ error: 'Failed to delete site' });
    }
  } else {
    res.setHeader('Allow', ['PUT', 'DELETE']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
