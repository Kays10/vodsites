import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateRequest } from '../_lib/auth';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = authenticateRequest(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized. Please log in.' });

  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url) return res.status(500).json({ error: 'Supabase URL not configured' });
  if (!key) return res.status(500).json({ error: 'Supabase key not configured' });

  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  try {
    const { id } = req.query;
    const userId = Array.isArray(id) ? id[0] : id;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'User id is required.' });
    }

    if (userId === auth.userId) {
      return res.status(400).json({ error: 'You cannot delete your own account.' });
    }

    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteAuthError) {
      console.error('Error deleting Supabase Auth user:', deleteAuthError);
    }

    const { error: deleteLocalError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (deleteLocalError) {
      console.error('Error deleting local user row:', deleteLocalError);
    }

    return res.status(204).end();
  } catch (error) {
    console.error('Delete user unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
