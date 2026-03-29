/**
 * webmasterAuth.ts
 * Autenticación separada para el panel webmaster.
 * Usa WEBMASTER_JWT_SECRET distinto al JWT de los tenants.
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const envSecret = process.env.WEBMASTER_JWT_SECRET;
if (!envSecret && process.env.NODE_ENV === 'production') {
  console.error('FATAL: WEBMASTER_JWT_SECRET no definido en produccion');
  process.exit(1);
}
export const WEBMASTER_JWT_SECRET = envSecret || crypto.randomBytes(64).toString('hex');

export interface WebmasterRequest extends Request {
  webmaster?: { id: string; name: string; email: string };
}

export function webmasterAuthMiddleware(
  req: WebmasterRequest,
  res: Response,
  next: NextFunction
): void {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    res.status(401).json({ error: 'No autorizado' });
    return;
  }
  try {
    const decoded = jwt.verify(token, WEBMASTER_JWT_SECRET) as {
      id: string; name: string; email: string;
    };
    req.webmaster = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Token webmaster inválido' });
  }
}
