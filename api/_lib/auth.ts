import { createHmac, timingSafeEqual } from 'crypto';
import type { VercelRequest } from '@vercel/node';

export interface JwtPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

function readEnv(key: string): string {
  const v = process.env[key];
  return typeof v === 'string' ? v : '';
}

const JWT_SECRET = readEnv('JWT_SECRET') || 'change-me-in-production-please-set-env-var';

function base64UrlDecode(input: string): Buffer {
  let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) base64 += '=';
  return Buffer.from(base64, 'base64');
}

function base64UrlEncode(buf: Buffer | string): string {
  const b = typeof buf === 'string' ? Buffer.from(buf, 'utf8') : buf;
  return b
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, claimsB64, signatureB64] = parts;
    const signingInput = `${headerB64}.${claimsB64}`;

    const expectedSignature = createHmac('sha256', JWT_SECRET).update(signingInput).digest();
    const providedSignature = base64UrlDecode(signatureB64);

    if (expectedSignature.length !== providedSignature.length) return null;
    if (!timingSafeEqual(expectedSignature, providedSignature)) return null;

    const claims = JSON.parse(base64UrlDecode(claimsB64).toString('utf8')) as JwtPayload;
    if (claims.exp) {
      const now = Math.floor(Date.now() / 1000);
      if (now > claims.exp) return null;
    }
    if (!claims.userId || !claims.email) return null;
    return claims;
  } catch {
    return null;
  }
}

export function extractTokenFromRequest(req: VercelRequest): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  if (req.cookies && req.cookies.auth_token) {
    return req.cookies.auth_token;
  }
  return null;
}

export function authenticateRequest(req: VercelRequest): JwtPayload | null {
  const token = extractTokenFromRequest(req);
  if (!token) return null;
  return verifyToken(token);
}
