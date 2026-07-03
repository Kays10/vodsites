
import { neon } from '@neondatabase/serverless';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: 'DATABASE_URL not configured' });
  }
  const sql = neon(process.env.DATABASE_URL);
  const { id } = req.query.id as string;

  if (req.method === 'PUT') {
    try {
      const site = req.body;
      const result = await sql`
        UPDATE sites
        SET
          name = ${site.name},
          "group" = ${site.group},
          services = ${JSON.stringify(site.services)},
          vpn = ${site.vpn || null},
          pms = ${site.pms || null},
          hsia = ${site.hsia || null},
          ip = ${site.ip || null},
          iptv_system = ${site.iptvSystem || null},
          iptv_url = ${site.iptvUrl || null},
          casting_url = ${site.castingUrl || null},
          headend = ${site.headend || null},
          headend_url = ${site.headendUrl || null},
          switches = ${site.switches || null},
          wlan_controller = ${site.wlanController || null},
          wlan_controller_url = ${site.wlanControllerUrl || null},
          notes = ${site.notes || null},
          other = ${site.other || null}
        WHERE id = ${id}
        RETURNING *
      `;
      if (result.length === 0) {
        return res.status(404).json({ error: 'Site not found' });
      }
      return res.status(200).json(result[0]);
    } catch (error) {
      console.error('Error updating site:', error);
      return res.status(500).json({ error: 'Failed to update site' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const result = await sql`DELETE FROM sites WHERE id = ${id} RETURNING *`;
      if (result.length === 0) {
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
