
import { neon } from '@neondatabase/serverless';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: 'DATABASE_URL not configured' });
  }
  const sql = neon(process.env.DATABASE_URL);

  if (req.method === 'GET') {
    try {
      const result = await sql`SELECT * FROM sites ORDER BY name ASC`;
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error fetching sites:', error);
      return res.status(500).json({ error: 'Failed to fetch sites' });
    }
  } else if (req.method === 'POST') {
    try {
      const site = req.body;
      const result = await sql`
        INSERT INTO sites (
          id, name, "group", services, vpn, pms, hsia, ip, iptv_system, iptv_url,
          casting_url, headend, headend_url, switches, wlan_controller,
          wlan_controller_url, notes, other
        ) VALUES (
          ${site.id}, ${site.name}, ${site.group}, ${JSON.stringify(site.services)},
          ${site.vpn || null}, ${site.pms || null}, ${site.hsia || null},
          ${site.ip || null}, ${site.iptvSystem || null}, ${site.iptvUrl || null},
          ${site.castingUrl || null}, ${site.headend || null},
          ${site.headendUrl || null}, ${site.switches || null},
          ${site.wlanController || null}, ${site.wlanControllerUrl || null},
          ${site.notes || null}, ${site.other || null}
        ) RETURNING *
      `;
      return res.status(201).json(result[0]);
    } catch (error) {
      console.error('Error creating site:', error);
      return res.status(500).json({ error: 'Failed to create site' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
