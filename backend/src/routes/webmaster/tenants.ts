/**
 * Rutas de gestión de tenants para el panel webmaster.
 *
 * GET    /webmaster/api/tenants               → listar todos
 * POST   /webmaster/api/tenants               → crear + provisionar + billing
 * PATCH  /webmaster/api/tenants/:id           → editar (nombre, plan, status)
 * POST   /webmaster/api/tenants/:id/suspend   → suspender
 * POST   /webmaster/api/tenants/:id/activate  → activar
 * DELETE /webmaster/api/tenants/:id           → eliminar (hard delete)
 */
import { Router, Response } from 'express';
import { z } from 'zod';
import { masterStore } from '../../db/masterDatabase';
import { tenantPool } from '../../db/tenantPool';
import { webmasterAuthMiddleware, WebmasterRequest } from '../../middleware/webmasterAuth';
import { createSubscription, BILLING_ENABLED, BillingResult } from '../../services/billing';

const router = Router();
router.use(webmasterAuthMiddleware);

// ── Schemas ───────────────────────────────────────────────────────────────────

const createTenantSchema = z.object({
  slug:        z.string()
    .min(2).max(30)
    .regex(/^[a-z0-9-]+$/, 'El slug solo puede contener letras minúsculas, números y guiones'),
  name:        z.string().min(2).max(100),
  admin_email: z.string().email(),
  plan:        z.enum(['basic', 'pro', 'enterprise']).default('basic'),
  country:     z.string().length(2).default('PE'),   // ISO 3166-1 alpha-2
});

const updateTenantSchema = z.object({
  name:   z.string().min(2).max(100).optional(),
  plan:   z.enum(['basic', 'pro', 'enterprise']).optional(),
  status: z.enum(['active', 'suspended', 'trial']).optional(),
}).strict();


// ── Routes ────────────────────────────────────────────────────────────────────

// GET /webmaster/api/tenants
router.get('/', (_req: WebmasterRequest, res: Response): void => {
  res.json(masterStore.getAllTenants());
});

// GET /webmaster/api/tenants/:id
router.get('/:id', (req: WebmasterRequest, res: Response): void => {
  const tenant = masterStore.getTenantById(req.params.id);
  if (!tenant) { res.status(404).json({ error: 'Tenant no encontrado' }); return; }
  res.json(tenant);
});

// POST /webmaster/api/tenants — crear + provisionar + billing
router.post('/', async (req: WebmasterRequest, res: Response): Promise<void> => {
  const parsed = createTenantSchema.safeParse(req.body);
  if (!parsed.success) {
    const issues = (parsed.error as any).issues ?? [];
    res.status(400).json({ error: issues[0]?.message ?? 'Datos inválidos' });
    return;
  }

  const { slug, name, admin_email, plan, country } = parsed.data;

  if (masterStore.slugExists(slug)) {
    res.status(409).json({ error: `El slug '${slug}' ya está en uso` });
    return;
  }

  // 1. Crear en master DB — empieza en 'trial' hasta que pague
  const initialStatus = BILLING_ENABLED ? 'trial' : 'active';
  const tenant = masterStore.createTenant({ slug, name, admin_email, plan, status: initialStatus });

  // 2. Provisionar DB del tenant (directorio + schema + seed + usuario gerente)
  const tempPassword = tenantPool.provisionTenant(slug, admin_email);

  // 3. Crear subscription en DodoPayments
  let billing: BillingResult = { customerId: null, subscriptionId: null, paymentLink: null };
  let billingError: string | null = null;

  try {
    billing = await createSubscription({
      tenantId: tenant.id, tenantName: name,
      email: admin_email, slug, country,
    });

    if (billing.customerId || billing.subscriptionId) {
      masterStore.updateTenant(tenant.id, {
        dodo_customer_id:         billing.customerId,
        dodo_subscription_id:     billing.subscriptionId,
        dodo_subscription_status: 'pending',
      });
    }
  } catch (err: any) {
    // Billing failed but tenant is already provisioned — log and continue
    billingError = err?.message ?? 'Error al crear la suscripción en DodoPayments';
    console.error('[Dodo] createSubscription failed:', billingError);
  }

  // Reload tenant with updated Dodo fields
  const finalTenant = masterStore.getTenantById(tenant.id)!;

  res.status(201).json({
    tenant:  finalTenant,
    credentials: {
      email:       admin_email,
      tempPassword,
      message:     'Comparte estas credenciales con el administrador del restaurante',
    },
    billing: {
      enabled:     BILLING_ENABLED,
      paymentLink: billing.paymentLink,
      error:       billingError,
      message:     billing.paymentLink
        ? 'Envía este link de pago al cliente para activar su suscripción'
        : BILLING_ENABLED
          ? 'No se pudo generar el link de pago — activa el tenant manualmente tras el pago'
          : 'Billing no configurado — tenant activado directamente',
    },
  });
});

// PATCH /webmaster/api/tenants/:id
router.patch('/:id', (req: WebmasterRequest, res: Response): void => {
  const tenant = masterStore.getTenantById(req.params.id);
  if (!tenant) { res.status(404).json({ error: 'Tenant no encontrado' }); return; }

  const parsed = updateTenantSchema.safeParse(req.body);
  if (!parsed.success) {
    const issues = (parsed.error as any).issues ?? [];
    res.status(400).json({ error: issues[0]?.message ?? 'Datos inválidos' });
    return;
  }

  res.json(masterStore.updateTenant(req.params.id, parsed.data));
});

// POST /webmaster/api/tenants/:id/suspend
router.post('/:id/suspend', (req: WebmasterRequest, res: Response): void => {
  const tenant = masterStore.getTenantById(req.params.id);
  if (!tenant) { res.status(404).json({ error: 'Tenant no encontrado' }); return; }
  if (tenant.status === 'suspended') {
    res.status(409).json({ error: 'El tenant ya está suspendido' });
    return;
  }
  res.json(masterStore.updateTenant(req.params.id, { status: 'suspended' }));
});

// POST /webmaster/api/tenants/:id/activate
router.post('/:id/activate', (req: WebmasterRequest, res: Response): void => {
  const tenant = masterStore.getTenantById(req.params.id);
  if (!tenant) { res.status(404).json({ error: 'Tenant no encontrado' }); return; }
  res.json(masterStore.updateTenant(req.params.id, { status: 'active' }));
});

// DELETE /webmaster/api/tenants/:id
router.delete('/:id', (req: WebmasterRequest, res: Response): void => {
  const tenant = masterStore.getTenantById(req.params.id);
  if (!tenant) { res.status(404).json({ error: 'Tenant no encontrado' }); return; }
  tenantPool.closeDb(tenant.slug);
  masterStore.deleteTenant(req.params.id);
  res.status(204).send();
});

export default router;
