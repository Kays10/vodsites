import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateRequest } from '../_lib/auth';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = authenticateRequest(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized. Please log in.' });

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url) return res.status(500).json({ error: 'Supabase URL not configured' });
  if (!key) return res.status(500).json({ error: 'Supabase key not configured' });

  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, is_active, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map((u: any) => ({
        id: u.id,
        email: u.email,
        fullName: u.full_name,
        isActive: u.is_active,
        createdAt: u.created_at,
      }));

      return res.status(200).json(mapped);
    } catch (error) {
      console.error('Error listing users:', error);
      return res.status(500).json({ error: 'Failed to list users' });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = req.body || {};
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const password = typeof body.password === 'string' ? body.password : '';
      const fullName = typeof body.fullName === 'string' && body.fullName.length > 0
        ? body.fullName
        : null;

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'A valid email is required.' });
      }
      if (!password || password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
      }

      const { data: authUser, error: createAuthError } =
        await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: fullName ? { full_name: fullName } : undefined,
        });

      if (createAuthError || !authUser.user) {
        const code = (createAuthError as any)?.code;
        if (code === 'user_already_exists' || /already/i.test((createAuthError as any)?.message || '')) {
          return res.status(409).json({ error: 'A user with this email already exists.' });
        }
        console.error('Error creating Supabase Auth user:', createAuthError);
        return res.status(500).json({ error: (createAuthError as any)?.message || 'Failed to create user.' });
      }

      const userId = authUser.user.id;

      const { error: insertLocalError } = await supabase
        .from('users')
        .insert([{
          id: userId,
          email,
          password_hash: '',
          full_name: fullName,
          is_active: true,
        }]);

      if (insertLocalError) {
        console.error('Error inserting into public.users:', insertLocalError);
      }

      return res.status(201).json({
        id: userId,
        email,
        fullName,
        isActive: true,
      });
    } catch (error) {
      console.error('Create user unexpected error:', error);
      return res.status(500).json({ error: 'Internal server error.' });
    }
  }

  if (req.method === 'DELETE') {
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

  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
