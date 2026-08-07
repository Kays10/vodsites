import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateRequest } from '../../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = authenticateRequest(req);
  if (!auth) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }

  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
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

    return res.status(204).send();
  } catch (error) {
    console.error('Delete user unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
