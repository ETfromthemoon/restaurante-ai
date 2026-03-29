/**
 * Rutas de gestión de tenants para el panel webmaster.
 *
 * GET    /webmaster/api/tenants            → listar todos
 * POST   /webmaster/api/tenants            → crear + provisionar
 * PATCH  /webmaster/api/tenants/:id        → editar (nombre, plan, status)
 * POST   /webmaster/api/tenants/:id/suspend   → suspender
 * POST   /webmaster/api/tenants/:id/activate  → activar
 * DELETE /webmaster/api/tenants/:id        → eliminar (hard delete)
 */
import { Router, Response } from 'express';
import { z } from 'zod';
import { masterStore } from '../../db/masterDatabase';
import { tenantPool } from '../../db/tenantPool';
import { webmasterAuthMiddleware, WebmasterRequest } from '../../middleware/webmasterAuth';

const router = Router();
router.use(webmasterAuthMiddleware);

// ── Schemas ──────────────────────────────────────────────────────────────────

const createTenantSchema = z.object({
  slug:        z.string()
    .min(2).max(30)
    .regex(/^[a-z0-9-]+$/, 'El slug solo puede contener letras minúsculas, números y guiones'),
  name:        z.string().min(2).max(100),
  admin_email: z.string().email(),
  plan:        z.enum(['basic', 'pro', 'enterprise']).default('basic'),
});

const updateTenantSchema = z.object({
  name:   z.string().min(2).max(100).optional(),
  plan:   z.enum(['basic', 'pro', 'enterprise']).optional(),
  status: z.enum(['active', 'suspended', 'trial']).optional(),
}).strict();

// ── Routes ───────────────────────────────────────────────────────────────────

// GET /webmaster/api/tenants
router.get('/', (_req: WebmasterRequest, res: Response): void => {
  const tenants = masterStore.getAllTenants();
  res.json(tenants);
});

// GET /webmaster/api/tenants/:id
router.get('/:id', (req: WebmasterRequest, res: Response): void => {
  const tenant = masterStore.getTenantById(req.params.id);
  if (!tenant) { res.status(404).json({ error: 'Tenant no encontrado' }); return; }
  res.json(tenant);
});

// POST /webmaster/api/tenants — crear y provisionar nuevo restaurante
router.post('/', (req: WebmasterRequest, res: Response): void => {
  const parsed = createTenantSchema.safeParse(req.body);
  if (!parsed.success) {
    const issues = (parsed.error as any).issues ?? [];
    res.status(400).json({ error: issues[0]?.message ?? 'Datos inválidos' });
    return;
  }

  const { slug, name, admin_email, plan } = parsed.data;

  // Verificar unicidad del slug
  if (masterStore.slugExists(slug)) {
    res.status(409).json({ error: `El slug '${slug}' ya está en uso` });
    return;
  }

  // Crear registro en master DB
  const tenant = masterStore.createTenant({
    slug,
    name,
    admin_email,
    plan,
    status: 'active',
  });

  // Provisionar DB del tenant (crea directorio + schema + seed)
  const tempPassword = tenantPool.provisionTenant(slug, admin_email);

  res.status(201).json({
    tenant,
    credentials: {
      email: admin_email,
      tempPassword,
      message: 'Comparte estas credenciales con el administrador del restaurante',
    },
  });
});

// PATCH /webmaster/api/tenants/:id — editar metadata
router.patch('/:id', (req: WebmasterRequest, res: Response): void => {
  const tenant = masterStore.getTenantById(req.params.id);
  if (!tenant) { res.status(404).json({ error: 'Tenant no encontrado' }); return; }

  const parsed = updateTenantSchema.safeParse(req.body);
  if (!parsed.success) {
    const issues = (parsed.error as any).issues ?? [];
    res.status(400).json({ error: issues[0]?.message ?? 'Datos inválidos' });
    return;
  }

  const updated = masterStore.updateTenant(req.params.id, parsed.data);
  res.json(updated);
});

// POST /webmaster/api/tenants/:id/suspend
router.post('/:id/suspend', (req: WebmasterRequest, res: Response): void => {
  const tenant = masterStore.getTenantById(req.params.id);
  if (!tenant) { res.status(404).json({ error: 'Tenant no encontrado' }); return; }
  if (tenant.status === 'suspended') {
    res.status(409).json({ error: 'El tenant ya está suspendido' });
    return;
  }
  const updated = masterStore.updateTenant(req.params.id, { status: 'suspended' });
  res.json(updated);
});

// POST /webmaster/api/tenants/:id/activate
router.post('/:id/activate', (req: WebmasterRequest, res: Response): void => {
  const tenant = masterStore.getTenantById(req.params.id);
  if (!tenant) { res.status(404).json({ error: 'Tenant no encontrado' }); return; }
  const updated = masterStore.updateTenant(req.params.id, { status: 'active' });
  res.json(updated);
});

// DELETE /webmaster/api/tenants/:id — hard delete
router.delete('/:id', (req: WebmasterRequest, res: Response): void => {
  const tenant = masterStore.getTenantById(req.params.id);
  if (!tenant) { res.status(404).json({ error: 'Tenant no encontrado' }); return; }

  // Cerrar la conexión DB del tenant si está activa
  tenantPool.closeDb(tenant.slug);

  masterStore.deleteTenant(req.params.id);
  res.status(204).send();
});

export default router;
