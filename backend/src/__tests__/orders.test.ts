import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../app';

// ─── Helper: obtener JWT por rol ────────────────────────────────────────────
const CREDENTIALS: Record<string, { email: string; password: string }> = {
  waiter:  { email: 'mesero@restaurante.com',  password: '1234' },
  cook:    { email: 'cocina@restaurante.com',  password: '1234' },
  manager: { email: 'gerente@restaurante.com', password: '1234' },
};

const tokens: Record<string, string> = {};

beforeAll(async () => {
  for (const role of ['waiter', 'cook', 'manager']) {
    const res = await request(app)
      .post('/api/auth/login')
      .send(CREDENTIALS[role]);
    tokens[role] = res.body.token;
  }
});

function auth(role: string) {
  return `Bearer ${tokens[role]}`;
}

// ─── Tests ──────────────────────────────────────────────────────────────────
describe('Orders API', () => {
  const TABLE_ID = 't1';
  const MENU_ITEM_ID = 'm1'; // Ceviche Clásico — S/ 48

  // 1. Crear orden
  it('crear orden → 201, status = open', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', auth('waiter'))
      .send({ table_id: TABLE_ID });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('open');
    expect(res.body.table_id).toBe(TABLE_ID);
  });

  // 2. Sin auth → 401
  it('crear orden sin autenticación → 401', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({ table_id: TABLE_ID });

    expect(res.status).toBe(401);
  });

  // 3. Cook no puede crear orden → 403
  it('crear orden como cook → 403', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', auth('cook'))
      .send({ table_id: TABLE_ID });

    expect(res.status).toBe(403);
  });

  // 4. Agregar item
  it('agregar item a pedido → 201', async () => {
    // Crear orden primero
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', auth('waiter'))
      .send({ table_id: TABLE_ID });
    const orderId = orderRes.body.id;

    const res = await request(app)
      .post(`/api/orders/${orderId}/items`)
      .set('Authorization', auth('waiter'))
      .send({ menu_item_id: MENU_ITEM_ID, quantity: 2 });

    expect(res.status).toBe(201);
    expect(res.body.menu_item_id).toBe(MENU_ITEM_ID);
    expect(res.body.quantity).toBe(2);
  });

  // 5. Cambiar cantidad válida
  it('actualizar cantidad de item → 200', async () => {
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', auth('waiter'))
      .send({ table_id: TABLE_ID });
    const orderId = orderRes.body.id;

    const itemRes = await request(app)
      .post(`/api/orders/${orderId}/items`)
      .set('Authorization', auth('waiter'))
      .send({ menu_item_id: MENU_ITEM_ID, quantity: 1 });
    const itemId = itemRes.body.id;

    const res = await request(app)
      .patch(`/api/orders/${orderId}/items/${itemId}`)
      .set('Authorization', auth('waiter'))
      .send({ quantity: 3 });

    expect(res.status).toBe(200);
    expect(res.body.quantity).toBe(3);
  });

  // 6. Cantidad 0 → 400 (Zod min 1)
  it('actualizar cantidad a 0 → 400', async () => {
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', auth('waiter'))
      .send({ table_id: TABLE_ID });
    const orderId = orderRes.body.id;

    const itemRes = await request(app)
      .post(`/api/orders/${orderId}/items`)
      .set('Authorization', auth('waiter'))
      .send({ menu_item_id: MENU_ITEM_ID, quantity: 1 });
    const itemId = itemRes.body.id;

    const res = await request(app)
      .patch(`/api/orders/${orderId}/items/${itemId}`)
      .set('Authorization', auth('waiter'))
      .send({ quantity: 0 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  // 7. Eliminar item
  it('eliminar item → 200 con success: true', async () => {
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', auth('waiter'))
      .send({ table_id: TABLE_ID });
    const orderId = orderRes.body.id;

    const itemRes = await request(app)
      .post(`/api/orders/${orderId}/items`)
      .set('Authorization', auth('waiter'))
      .send({ menu_item_id: MENU_ITEM_ID, quantity: 1 });
    const itemId = itemRes.body.id;

    const res = await request(app)
      .delete(`/api/orders/${orderId}/items/${itemId}`)
      .set('Authorization', auth('waiter'));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // 8. GET orden activa por mesa
  it('GET orden activa por mesa → 200 con items', async () => {
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', auth('waiter'))
      .send({ table_id: TABLE_ID });
    const orderId = orderRes.body.id;

    await request(app)
      .post(`/api/orders/${orderId}/items`)
      .set('Authorization', auth('waiter'))
      .send({ menu_item_id: MENU_ITEM_ID, quantity: 1 });

    const res = await request(app)
      .get(`/api/orders/table/${TABLE_ID}`)
      .set('Authorization', auth('waiter'));

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(orderId);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThan(0);
  });

  // 9. Enviar a cocina
  it('enviar a cocina → 200, status = kitchen', async () => {
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', auth('waiter'))
      .send({ table_id: TABLE_ID });
    const orderId = orderRes.body.id;

    await request(app)
      .post(`/api/orders/${orderId}/items`)
      .set('Authorization', auth('waiter'))
      .send({ menu_item_id: MENU_ITEM_ID, quantity: 1 });

    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', auth('waiter'))
      .send({ status: 'kitchen' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('kitchen');
  });

  // 10. Marcar entregado
  it('marcar entregado → 200, delivered_at presente', async () => {
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', auth('waiter'))
      .send({ table_id: TABLE_ID });
    const orderId = orderRes.body.id;

    await request(app)
      .post(`/api/orders/${orderId}/items`)
      .set('Authorization', auth('waiter'))
      .send({ menu_item_id: MENU_ITEM_ID, quantity: 1 });

    // ready → deliver
    await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', auth('waiter'))
      .send({ status: 'ready' });

    const res = await request(app)
      .patch(`/api/orders/${orderId}/deliver`)
      .set('Authorization', auth('waiter'));

    expect(res.status).toBe(200);
    expect(res.body.delivered_at).toBeDefined();
    expect(typeof res.body.delivered_at).toBe('string');
  });

  // 11. Solicitar cuenta
  it('solicitar cuenta → 200, status = billing', async () => {
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', auth('waiter'))
      .send({ table_id: TABLE_ID });
    const orderId = orderRes.body.id;

    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', auth('waiter'))
      .send({ status: 'billing' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('billing');
  });

  // 12. Flujo completo: open → items → kitchen → ready → deliver → billing → billed
  it('flujo completo open→kitchen→ready→deliver→billing→billed', async () => {
    // open
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', auth('waiter'))
      .send({ table_id: TABLE_ID });
    expect(orderRes.status).toBe(201);
    const orderId = orderRes.body.id;
    expect(orderRes.body.status).toBe('open');

    // agregar items
    const itemRes = await request(app)
      .post(`/api/orders/${orderId}/items`)
      .set('Authorization', auth('waiter'))
      .send({ menu_item_id: MENU_ITEM_ID, quantity: 2 });
    expect(itemRes.status).toBe(201);
    expect(itemRes.body.quantity).toBe(2);

    // kitchen
    const kitchenRes = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', auth('waiter'))
      .send({ status: 'kitchen' });
    expect(kitchenRes.status).toBe(200);
    expect(kitchenRes.body.status).toBe('kitchen');

    // ready — el waiter (o manager) actualiza el status, no el cook
    const readyRes = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', auth('waiter'))
      .send({ status: 'ready' });
    expect(readyRes.status).toBe(200);
    expect(readyRes.body.status).toBe('ready');

    // deliver
    const deliverRes = await request(app)
      .patch(`/api/orders/${orderId}/deliver`)
      .set('Authorization', auth('waiter'));
    expect(deliverRes.status).toBe(200);
    expect(deliverRes.body.delivered_at).toBeDefined();

    // billing
    const billingRes = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', auth('waiter'))
      .send({ status: 'billing' });
    expect(billingRes.status).toBe(200);
    expect(billingRes.body.status).toBe('billing');

    // billed
    const billedRes = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', auth('manager'))
      .send({ status: 'billed' });
    expect(billedRes.status).toBe(200);
    expect(billedRes.body.status).toBe('billed');
  });
});
