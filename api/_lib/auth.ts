import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import jwt from 'jsonwebtoken';
import type { VercelRequest } from '@vercel/node';

export interface JwtPayload {
  userId: string;
  email: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production-please-set-env-var';
const SALT_ROUNDS = 16;
const TOKEN_EXPIRES_IN = '7d';

export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_ROUNDS).toString('hex');
  const derivedKey = scryptSync(password, salt, 64) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return false;
    const derivedKey = scryptSync(password, salt, 64) as Buffer;
    const keyBuffer = Buffer.from(key, 'hex');
    if (derivedKey.length !== keyBuffer.length) return false;
    return timingSafeEqual(derivedKey, keyBuffer);
  } catch {
    return false;
  }
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return decoded;
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
