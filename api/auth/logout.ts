import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  res.setHeader(
    'Set-Cookie',
    'auth_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax'
  );

  return res.status(200).json({ success: true });
}
