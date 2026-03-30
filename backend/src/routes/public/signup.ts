/**
 * Rutas públicas de auto-registro (sin autenticación, sin tenant middleware).
 *
 * GET  /public/api/check-slug/:slug  → verifica disponibilidad del subdominio
 * POST /public/api/signup            → crea cuenta + DB + subscription Dodo
 *                                      devuelve paymentLink para redirigir
 */
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { masterStore } from '../../db/masterDatabase';
import { tenantPool } from '../../db/tenantPool';
import { createSubscription, BILLING_ENABLED, BASE_DOMAIN } from '../../services/billing';

const router = Router();

// ── Schemas ───────────────────────────────────────────────────────────────────

const signupSchema = z.object({
  name:     z.string().min(2).max(100),
  slug:     z.string()
    .min(2).max(30)
    .regex(/^[a-z0-9-]+$/, 'El subdominio solo puede contener letras minúsculas, números y guiones'),
  email:    z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  country:  z.string().length(2).default('PE'),
});

// ── GET /public/api/check-slug/:slug ─────────────────────────────────────────

router.get('/check-slug/:slug', (req: Request, res: Response): void => {
  const { slug } = req.params;

  if (!/^[a-z0-9-]{2,30}$/.test(slug)) {
    res.json({ available: false, reason: 'Formato inválido' });
    return;
  }

  const taken = masterStore.slugExists(slug);
  res.json({ available: !taken });
});

// ── POST /public/api/signup ───────────────────────────────────────────────────

router.post('/signup', async (req: Request, res: Response): Promise<void> => {
  // 1. Validar input
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    const issues = (parsed.error as any).issues ?? [];
    res.status(400).json({ error: issues[0]?.message ?? 'Datos inválidos' });
    return;
  }

  const { name, slug, email, password, country } = parsed.data;

  // 2. Verificar que el slug no esté en uso
  if (masterStore.slugExists(slug)) {
    res.status(409).json({ error: `El subdominio "${slug}" ya está en uso. Elige otro.` });
    return;
  }

  // 3. Crear tenant en master DB — status inicial según si hay billing
  const initialStatus = BILLING_ENABLED ? 'trial' : 'active';
  const tenant = masterStore.createTenant({
    slug,
    name,
    admin_email: email,
    plan:        'basic',
    status:      initialStatus,
  });

  // 4. Provisionar DB con la contraseña elegida por el usuario
  tenantPool.provisionTenant(slug, email, password);

  // 5. Crear subscription en DodoPayments
  let paymentLink: string | null = null;
  let billingError: string | null = null;

  try {
    const billing = await createSubscription({
      tenantId:   tenant.id,
      tenantName: name,
      email,
      slug,
      country,
    });

    paymentLink = billing.paymentLink;

    if (billing.customerId || billing.subscriptionId) {
      masterStore.updateTenant(tenant.id, {
        dodo_customer_id:         billing.customerId,
        dodo_subscription_id:     billing.subscriptionId,
        dodo_subscription_status: 'pending',
      });
    }
  } catch (err: any) {
    billingError = err?.message ?? 'Error al configurar el pago';
    console.error('[Signup] Dodo error:', billingError);
    // Si falla el billing, activar directamente para no bloquear al usuario
    masterStore.updateTenant(tenant.id, { status: 'active' });
  }

  // 6. Responder con el link de pago (o redirect directo si no hay billing)
  const loginUrl = `https://${slug}.${BASE_DOMAIN}/login?welcome=1`;

  res.status(201).json({
    success:      true,
    slug,
    paymentLink,                      // null si billing no configurado o falló
    redirectTo:   paymentLink ?? loginUrl, // frontend redirige aquí
    billingError,
  });
});

export default router;
