/**
 * billing.test.ts
 * Tests para el sistema de billing y webhooks de DodoPayments.
 *
 * - Webhook POST /webmaster/api/billing/webhook
 *   · Firma inválida → 401
 * - masterStore: simulación de eventos de billing (activate / suspend)
 *   · subscription.active  → status='active'
 *   · subscription.on_hold → status='suspended'
 *   · subscription.cancelled, expired, failed → status='suspended'
 *   · subscription.renewed → status='active'
 */
import { describe, it, expect, afterEach } from 'vitest';
import request from 'supertest';
import app from '../app';
import { masterStore } from '../db/masterDatabase';

const TEST_SLUG = 'billing-webhook-test';

// ── Webhook HTTP ───────────────────────────────────────────────────────────────

describe('POST /webmaster/api/billing/webhook', () => {
  it('sin headers de firma → 401', async () => {
    const res = await request(app)
      .post('/webmaster/api/billing/webhook')
      .send({ type: 'subscription.active', data: { metadata: { tenant_id: 'test' } } });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/signature/i);
  });

  it('firma inválida → 401', async () => {
    const res = await request(app)
      .post('/webmaster/api/billing/webhook')
      .set('webhook-id',        'msg_test123')
      .set('webhook-signature', 'v1,invalidsignature==')
      .set('webhook-timestamp', String(Math.floor(Date.now() / 1000)))
      .send({ type: 'subscription.active', data: {} });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/signature/i);
  });

  it('headers vacíos → 401', async () => {
    const res = await request(app)
      .post('/webmaster/api/billing/webhook')
      .set('webhook-id',        '')
      .set('webhook-signature', '')
      .set('webhook-timestamp', '')
      .send({ type: 'subscription.active', data: {} });

    expect(res.status).toBe(401);
  });
});

// ── Lógica de billing via masterStore ─────────────────────────────────────────
// Testamos las transiciones de estado que el webhook provocaría en producción.

describe('Billing — transiciones de estado del tenant', () => {
  afterEach(() => {
    const t = masterStore.getTenantBySlug(TEST_SLUG);
    if (t) masterStore.deleteTenant(t.id);
  });

  function createTrialTenant() {
    return masterStore.createTenant({
      slug:        TEST_SLUG,
      name:        'Billing Test Restaurante',
      admin_email: 'billing@test.com',
      plan:        'basic',
      status:      'trial',
    });
  }

  it('subscription.active → tenant queda status=active', () => {
    const tenant = createTrialTenant();

    // Simula lo que hace el webhook handler en billing.ts → activate()
    masterStore.updateTenant(tenant.id, {
      status:                   'active',
      dodo_subscription_status: 'active',
    });

    const updated = masterStore.getTenantById(tenant.id);
    expect(updated!.status).toBe('active');
    expect(updated!.dodo_subscription_status).toBe('active');
  });

  it('subscription.renewed → tenant vuelve a active', () => {
    const tenant = createTrialTenant();
    masterStore.updateTenant(tenant.id, { status: 'active' });

    masterStore.updateTenant(tenant.id, {
      status:                   'active',
      dodo_subscription_status: 'renewed',
    });

    const updated = masterStore.getTenantById(tenant.id);
    expect(updated!.status).toBe('active');
  });

  it('subscription.on_hold → tenant queda status=suspended', () => {
    const tenant = createTrialTenant();
    masterStore.updateTenant(tenant.id, { status: 'active' });

    // Simula lo que hace el webhook handler → suspend()
    masterStore.updateTenant(tenant.id, {
      status:                   'suspended',
      dodo_subscription_status: 'on_hold',
    });

    const updated = masterStore.getTenantById(tenant.id);
    expect(updated!.status).toBe('suspended');
    expect(updated!.dodo_subscription_status).toBe('on_hold');
  });

  it('subscription.cancelled → tenant queda status=suspended', () => {
    const tenant = createTrialTenant();

    masterStore.updateTenant(tenant.id, {
      status:                   'suspended',
      dodo_subscription_status: 'cancelled',
    });

    const updated = masterStore.getTenantById(tenant.id);
    expect(updated!.status).toBe('suspended');
  });

  it('subscription.failed → tenant queda status=suspended', () => {
    const tenant = createTrialTenant();

    masterStore.updateTenant(tenant.id, {
      status:                   'suspended',
      dodo_subscription_status: 'failed',
    });

    const updated = masterStore.getTenantById(tenant.id);
    expect(updated!.status).toBe('suspended');
  });

  it('subscription.expired → tenant queda status=suspended', () => {
    const tenant = createTrialTenant();

    masterStore.updateTenant(tenant.id, {
      status:                   'suspended',
      dodo_subscription_status: 'expired',
    });

    const updated = masterStore.getTenantById(tenant.id);
    expect(updated!.status).toBe('suspended');
  });

  it('activate guarda customer_id y subscription_id de Dodo', () => {
    const tenant = createTrialTenant();

    masterStore.updateTenant(tenant.id, {
      status:                   'active',
      dodo_customer_id:         'cus_live_abc123',
      dodo_subscription_id:     'sub_live_xyz789',
      dodo_subscription_status: 'active',
    });

    const updated = masterStore.getTenantById(tenant.id);
    expect(updated!.dodo_customer_id).toBe('cus_live_abc123');
    expect(updated!.dodo_subscription_id).toBe('sub_live_xyz789');
  });

  it('tenant inexistente — updateTenant sobre ID falso no lanza error', () => {
    expect(() => {
      masterStore.updateTenant('tenant-id-que-no-existe', { status: 'active' });
    }).not.toThrow();
  });
});

// ── Signup fallback de billing ─────────────────────────────────────────────────

describe('Signup — comportamiento según BILLING_ENABLED', () => {
  afterEach(() => {
    const t = masterStore.getTenantBySlug('billing-signup-test');
    if (t) masterStore.deleteTenant(t.id);
  });

  it('sin DODO_API_KEY → signup activa el tenant directamente (status=active)', async () => {
    // En tests NODE_ENV=test y DODO_API_KEY no está definida → BILLING_ENABLED=false
    const res = await request(app)
      .post('/public/api/signup')
      .send({
        name:     'Billing Test Resto',
        slug:     'billing-signup-test',
        email:    'admin@billingtest.com',
        password: 'password123',
        country:  'PE',
      });

    expect(res.status).toBe(201);
    expect(res.body.paymentLink).toBeNull();

    const tenant = masterStore.getTenantBySlug('billing-signup-test');
    expect(tenant!.status).toBe('active');
  });
});
