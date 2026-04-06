/**
 * signup.test.ts
 * Tests de integración para el flujo de auto-registro de tenants.
 *
 * GET  /public/api/check-slug/:slug  → disponibilidad del subdominio
 * POST /public/api/signup            → creación de cuenta + provisioning
 *
 * Nota: en modo test la masterDb es in-memory (ver masterDatabase.ts).
 * El tenantPool puede crear directorios temporales en data/tenants/.
 */
import { describe, it, expect, afterEach } from 'vitest';
import request from 'supertest';
import app from '../app';
import { masterStore } from '../db/masterDatabase';

const TEST_SLUG = 'signup-test-resto';

// ── GET /public/api/check-slug/:slug ──────────────────────────────────────────

describe('GET /public/api/check-slug/:slug', () => {
  afterEach(() => {
    const t = masterStore.getTenantBySlug(TEST_SLUG);
    if (t) masterStore.deleteTenant(t.id);
  });

  it('slug disponible → { available: true }', async () => {
    const res = await request(app).get('/public/api/check-slug/restaurante-libre-abc');
    expect(res.status).toBe(200);
    expect(res.body.available).toBe(true);
  });

  it('slug con mayúsculas → { available: false, reason }', async () => {
    const res = await request(app).get('/public/api/check-slug/RestauranteMalo');
    expect(res.status).toBe(200);
    expect(res.body.available).toBe(false);
    expect(res.body.reason).toBeDefined();
  });

  it('slug de 1 caracter (muy corto) → { available: false }', async () => {
    const res = await request(app).get('/public/api/check-slug/a');
    expect(res.status).toBe(200);
    expect(res.body.available).toBe(false);
  });

  it('slug con espacios → { available: false }', async () => {
    const res = await request(app).get('/public/api/check-slug/mi%20restaurante');
    expect(res.status).toBe(200);
    expect(res.body.available).toBe(false);
  });

  it('slug ya ocupado → { available: false }', async () => {
    // El tenant 'demo' se crea en el seed de dev de masterDatabase
    const res = await request(app).get('/public/api/check-slug/demo');
    expect(res.status).toBe(200);
    expect(res.body.available).toBe(false);
  });

  it('slug válido recién registrado → available false en segunda consulta', async () => {
    masterStore.createTenant({
      slug:        TEST_SLUG,
      name:        'Restaurante Test',
      admin_email: 'admin@test.com',
      plan:        'basic',
      status:      'active',
    });
    const res = await request(app).get(`/public/api/check-slug/${TEST_SLUG}`);
    expect(res.status).toBe(200);
    expect(res.body.available).toBe(false);
  });
});

// ── POST /public/api/signup ───────────────────────────────────────────────────

describe('POST /public/api/signup', () => {
  const validPayload = {
    name:     'El Fogón Test',
    slug:     TEST_SLUG,
    email:    'gerente@elfogon.com',
    password: 'password123',
    country:  'PE',
  };

  afterEach(() => {
    const t = masterStore.getTenantBySlug(TEST_SLUG);
    if (t) masterStore.deleteTenant(t.id);
  });

  it('datos válidos → 201 con success, slug y redirectTo', async () => {
    const res = await request(app)
      .post('/public/api/signup')
      .send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.slug).toBe(TEST_SLUG);
    expect(res.body.redirectTo).toBeDefined();
    expect(typeof res.body.redirectTo).toBe('string');
  });

  it('crea el tenant en la master DB con los datos correctos', async () => {
    await request(app).post('/public/api/signup').send(validPayload);

    const tenant = masterStore.getTenantBySlug(TEST_SLUG);
    expect(tenant).toBeDefined();
    expect(tenant!.name).toBe(validPayload.name);
    expect(tenant!.admin_email).toBe(validPayload.email);
    expect(tenant!.plan).toBe('basic');
  });

  it('sin billing configurado → tenant queda en status active inmediatamente', async () => {
    // En tests DODO_API_KEY no está definida → BILLING_ENABLED = false
    await request(app).post('/public/api/signup').send(validPayload);

    const tenant = masterStore.getTenantBySlug(TEST_SLUG);
    expect(tenant!.status).toBe('active');
  });

  it('slug duplicado → 409 con mensaje de error', async () => {
    await request(app).post('/public/api/signup').send(validPayload);

    const res = await request(app).post('/public/api/signup').send(validPayload);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/ya está en uso/i);
  });

  it('email inválido → 400', async () => {
    const res = await request(app)
      .post('/public/api/signup')
      .send({ ...validPayload, email: 'noesuncorreo' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('contraseña menor a 8 caracteres → 400', async () => {
    const res = await request(app)
      .post('/public/api/signup')
      .send({ ...validPayload, password: 'corta' });
    expect(res.status).toBe(400);
  });

  it('slug con caracteres inválidos (mayúsculas, espacios) → 400', async () => {
    const res = await request(app)
      .post('/public/api/signup')
      .send({ ...validPayload, slug: 'Mi Restaurante!' });
    expect(res.status).toBe(400);
  });

  it('nombre demasiado corto (1 char) → 400', async () => {
    const res = await request(app)
      .post('/public/api/signup')
      .send({ ...validPayload, name: 'A' });
    expect(res.status).toBe(400);
  });

  it('sin nombre → 400', async () => {
    const { name: _name, ...noName } = validPayload;
    const res = await request(app)
      .post('/public/api/signup')
      .send(noName);
    expect(res.status).toBe(400);
  });

  it('sin slug → 400', async () => {
    const { slug: _slug, ...noSlug } = validPayload;
    const res = await request(app)
      .post('/public/api/signup')
      .send(noSlug);
    expect(res.status).toBe(400);
  });
});
