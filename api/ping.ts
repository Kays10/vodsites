import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateRequest } from './_lib/auth';  // static import of auth

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({ 
    ok: true, 
    node: process.version,
    auth: typeof authenticateRequest,
    jwt_set: !!process.env.JWT_SECRET
  });
}
