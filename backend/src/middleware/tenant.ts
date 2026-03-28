/**
 * tenant.ts
 * Middleware que identifica el tenant de cada request desde el subdominio.
 * Carga la DB del tenant y expone req.store a todas las rutas.
 */
import { Request, Response, NextFunction } from 'express';
import { masterStore } from '../db/masterDatabase';
import { tenantPool, getTestDb } from '../db/tenantPool';
import { createStore, Store } from '../db/store';

// Extender Express Request con tenant info
declare global {
  namespace Express {
    interface Request {
      tenantSlug: string;
      tenantId:   string;
      store:      Store;
    }
  }
}

/**
 * Extrae el slug del tenant desde el header Host.
 * elfogon.miapp.com → 'elfogon'
 * En dev acepta también el header X-Tenant-Slug.
 */
function extractSlug(req: Request): string | null {
  // Prioridad 1: header explícito (desarrollo local / tests E2E)
  const explicit = req.headers['x-tenant-slug'] as string | undefined;
  if (explicit) return explicit.toLowerCase().trim();

  const host = req.headers.host || '';
  // Quitar puerto si lo hay: elfogon.miapp.com:3000 → elfogon.miapp.com
  const hostWithoutPort = host.split(':')[0];
  const parts = hostWithoutPort.split('.');

  // Necesita al menos 3 partes: slug.dominio.tld
  if (parts.length < 3) return null;

  const slug = parts[0].toLowerCase();
  // Ignorar subdominios reservados
  if (['www', 'api', 'webmaster', 'admin'].includes(slug)) return null;

  return slug;
}

export function tenantMiddleware(req: Request, res: Response, next: NextFunction): void {
  // ── Modo test ────────────────────────────────────────────
  if (process.env.NODE_ENV === 'test') {
    req.tenantSlug = 'test';
    req.tenantId   = 't_test';
    req.store      = createStore(getTestDb());
    return next();
  }

  // ── Modo dev/producción ───────────────────────────────────
  const slug = extractSlug(req);

  if (!slug) {
    // Sin slug → usar tenant 'demo' en desarrollo, error en producción
    if (process.env.NODE_ENV === 'production') {
      res.status(404).json({ error: 'Restaurante no encontrado' });
      return;
    }
    // Dev sin subdominio → usar demo
    req.tenantSlug = 'demo';
    req.tenantId   = 't_demo';
    req.store      = createStore(tenantPool.getDb('demo'));
    return next();
  }

  // Buscar tenant en master DB
  const tenant = masterStore.getTenantBySlug(slug);
  if (!tenant) {
    res.status(404).json({ error: 'Restaurante no encontrado' });
    return;
  }

  if (tenant.status === 'suspended') {
    res.status(402).json({
      error: 'Esta cuenta ha sido suspendida. Contacta al soporte para más información.',
    });
    return;
  }

  const db = tenantPool.getDb(slug);
  req.tenantSlug = slug;
  req.tenantId   = tenant.id;
  req.store      = createStore(db);
  next();
}
