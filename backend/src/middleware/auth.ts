import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { canAccess } from '../config/permissions.config';
import type { Store } from '../db/store';

// JWT_SECRET: obligatorio en produccion, auto-generado en desarrollo
const envSecret = process.env.JWT_SECRET;
if (!envSecret && process.env.NODE_ENV === 'production') {
  console.error('FATAL: JWT_SECRET no definido en produccion');
  process.exit(1);
}
export const JWT_SECRET = envSecret || crypto.randomBytes(64).toString('hex');

export interface AuthRequest extends Request {
  user?: { id: string; role: string; name: string; tenant?: string };
  // Inyectados por tenantMiddleware:
  tenantSlug: string;
  tenantId:   string;
  store:      Store;
}

/** Middleware para roles específicos */
export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'No tienes permisos para esta acción' });
      return;
    }
    next();
  };
}

/** Middleware basado en la matriz centralizada de permisos */
export function requirePermission(resource: string, action: string) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }
    if (!canAccess(req.user.role, resource, action)) {
      res.status(403).json({ error: 'No tienes permisos para esta acción' });
      return;
    }
    next();
  };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    res.status(401).json({ error: 'No autorizado' });
    return;
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: string; name: string; tenant?: string };

    // En producción validar que el token corresponde al tenant del request
    if (process.env.NODE_ENV === 'production' && decoded.tenant && req.tenantSlug) {
      if (decoded.tenant !== req.tenantSlug) {
        res.status(403).json({ error: 'Token no válido para este restaurante' });
        return;
      }
    }

    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}
