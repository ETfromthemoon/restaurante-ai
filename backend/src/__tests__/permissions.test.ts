/**
 * permissions.test.ts
 *
 * Tests de la matriz de permisos:
 * 1. Tests unitarios de canAccess()
 * 2. Tests de integración HTTP para cada rol × endpoint crítico
 */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../app';
import { canAccess } from '../config/permissions.config';

// ---------------------------------------------------------------------------
// Helpers — obtener tokens por rol
// ---------------------------------------------------------------------------
async function getToken(email: string, password = '1234'): Promise<string> {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password });
  return res.body.token as string;
}

let waiterToken: string;
let cookToken: string;
let managerToken: string;

beforeAll(async () => {
  waiterToken  = await getToken('mesero@restaurante.com');
  cookToken    = await getToken('cocina@restaurante.com');
  managerToken = await getToken('gerente@restaurante.com');
});

// ---------------------------------------------------------------------------
// SECCIÓN 1: Tests unitarios de canAccess()
// ---------------------------------------------------------------------------
describe('canAccess() — matriz de permisos', () => {
  describe('Órdenes', () => {
    it('waiter puede crear orden', () => {
      expect(canAccess('waiter', 'orders', 'create')).toBe(true);
    });
    it('cook NO puede crear orden', () => {
      expect(canAccess('cook', 'orders', 'create')).toBe(false);
    });
    it('manager puede crear orden', () => {
      expect(canAccess('manager', 'orders', 'create')).toBe(true);
    });
    it('waiter puede cambiar estado de orden', () => {
      expect(canAccess('waiter', 'orders', 'updateStatus')).toBe(true);
    });
    it('cook NO puede cambiar estado de orden', () => {
      expect(canAccess('cook', 'orders', 'updateStatus')).toBe(false);
    });
    it('cook puede actualizar estado de ítem en cocina', () => {
      expect(canAccess('cook', 'orders', 'updateItemStatus')).toBe(true);
    });
    it('waiter NO puede actualizar estado de ítem en cocina', () => {
      expect(canAccess('waiter', 'orders', 'updateItemStatus')).toBe(false);
    });
    it('waiter puede eliminar ítem', () => {
      expect(canAccess('waiter', 'orders', 'deleteItem')).toBe(true);
    });
    it('cook NO puede eliminar ítem', () => {
      expect(canAccess('cook', 'orders', 'deleteItem')).toBe(false);
    });
    it('waiter puede marcar como entregado', () => {
      expect(canAccess('waiter', 'orders', 'deliver')).toBe(true);
    });
    it('cook NO puede marcar como entregado', () => {
      expect(canAccess('cook', 'orders', 'deliver')).toBe(false);
    });
  });

  describe('Menú', () => {
    it('manager puede crear plato', () => {
      expect(canAccess('manager', 'menu', 'create')).toBe(true);
    });
    it('waiter NO puede crear plato', () => {
      expect(canAccess('waiter', 'menu', 'create')).toBe(false);
    });
    it('cook NO puede crear plato', () => {
      expect(canAccess('cook', 'menu', 'create')).toBe(false);
    });
    it('todos pueden ver el menú', () => {
      expect(canAccess('waiter',  'menu', 'read')).toBe(true);
      expect(canAccess('cook',    'menu', 'read')).toBe(true);
      expect(canAccess('manager', 'menu', 'read')).toBe(true);
    });
  });

  describe('Mesas', () => {
    it('manager puede asignar mesero a mesa', () => {
      expect(canAccess('manager', 'tables', 'assign')).toBe(true);
    });
    it('waiter NO puede asignar mesero a mesa', () => {
      expect(canAccess('waiter', 'tables', 'assign')).toBe(false);
    });
    it('cook NO puede actualizar estado de mesa', () => {
      expect(canAccess('cook', 'tables', 'update')).toBe(false);
    });
    it('waiter puede actualizar estado de mesa', () => {
      expect(canAccess('waiter', 'tables', 'update')).toBe(true);
    });
    it('solo manager puede listar meseros', () => {
      expect(canAccess('manager', 'tables', 'listWaiters')).toBe(true);
      expect(canAccess('waiter',  'tables', 'listWaiters')).toBe(false);
      expect(canAccess('cook',    'tables', 'listWaiters')).toBe(false);
    });
  });

  describe('Caja', () => {
    it('solo manager puede abrir caja', () => {
      expect(canAccess('manager', 'caja', 'open')).toBe(true);
      expect(canAccess('waiter',  'caja', 'open')).toBe(false);
      expect(canAccess('cook',    'caja', 'open')).toBe(false);
    });
    it('solo manager puede cerrar caja', () => {
      expect(canAccess('manager', 'caja', 'close')).toBe(true);
      expect(canAccess('waiter',  'caja', 'close')).toBe(false);
      expect(canAccess('cook',    'caja', 'close')).toBe(false);
    });
    it('waiter y manager pueden ver si hay caja activa', () => {
      expect(canAccess('waiter',  'caja', 'readActive')).toBe(true);
      expect(canAccess('manager', 'caja', 'readActive')).toBe(true);
    });
    it('cook NO puede ver caja activa', () => {
      expect(canAccess('cook', 'caja', 'readActive')).toBe(false);
    });
  });

  describe('Cocina', () => {
    it('cook y manager pueden ver estadísticas de cocina', () => {
      expect(canAccess('cook',    'kitchen', 'stats')).toBe(true);
      expect(canAccess('manager', 'kitchen', 'stats')).toBe(true);
    });
    it('waiter NO puede ver estadísticas de cocina', () => {
      expect(canAccess('waiter', 'kitchen', 'stats')).toBe(false);
    });
  });

  describe('IA', () => {
    it('solo manager puede ver resumen del turno', () => {
      expect(canAccess('manager', 'ai', 'shiftSummary')).toBe(true);
      expect(canAccess('waiter',  'ai', 'shiftSummary')).toBe(false);
      expect(canAccess('cook',    'ai', 'shiftSummary')).toBe(false);
    });
    it('waiter y manager pueden ver alertas de demoras', () => {
      expect(canAccess('waiter',  'ai', 'delayCheck')).toBe(true);
      expect(canAccess('manager', 'ai', 'delayCheck')).toBe(true);
    });
    it('cook NO puede ver alertas de demoras', () => {
      expect(canAccess('cook', 'ai', 'delayCheck')).toBe(false);
    });
  });

  describe('Recursos inexistentes', () => {
    it('recurso inexistente → false', () => {
      expect(canAccess('manager', 'recursoFalso', 'accion')).toBe(false);
    });
    it('acción inexistente → false', () => {
      expect(canAccess('manager', 'orders', 'accionFalsa')).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// SECCIÓN 2: Tests de integración HTTP
// ---------------------------------------------------------------------------
describe('HTTP — Control de Acceso por Endpoint', () => {

  describe('GET /api/orders — todos los roles', () => {
    it('waiter puede listar órdenes', async () => {
      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${waiterToken}`);
      expect(res.status).toBe(200);
    });
    it('cook puede listar órdenes', async () => {
      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${cookToken}`);
      expect(res.status).toBe(200);
    });
    it('sin token → 401', async () => {
      const res = await request(app).get('/api/orders');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/orders — solo waiter/manager', () => {
    it('cook intenta crear orden → 403', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${cookToken}`)
        .send({ table_id: 't1' });
      expect(res.status).toBe(403);
    });
    it('waiter puede crear orden', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({ table_id: 't1' });
      expect([200, 201]).toContain(res.status);
    });
    it('manager puede crear orden', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ table_id: 't1' });
      expect([200, 201]).toContain(res.status);
    });
  });

  describe('PATCH /api/orders/:id/status — solo waiter/manager', () => {
    it('cook intenta cambiar estado de orden → 403', async () => {
      const res = await request(app)
        .patch('/api/orders/o_cualquiera/status')
        .set('Authorization', `Bearer ${cookToken}`)
        .send({ status: 'billed' });
      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/orders/:id/items/:itemId — solo waiter/manager', () => {
    it('cook intenta eliminar ítem de orden → 403', async () => {
      const res = await request(app)
        .delete('/api/orders/o1/items/i1')
        .set('Authorization', `Bearer ${cookToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/orders/:id/deliver — solo waiter/manager', () => {
    it('cook intenta marcar como entregado → 403', async () => {
      const res = await request(app)
        .patch('/api/orders/o1/deliver')
        .set('Authorization', `Bearer ${cookToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/menu — todos', () => {
    it('cook puede ver el menú', async () => {
      const res = await request(app)
        .get('/api/menu')
        .set('Authorization', `Bearer ${cookToken}`);
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/menu — solo manager', () => {
    it('waiter intenta crear plato → 403', async () => {
      const res = await request(app)
        .post('/api/menu')
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({ name: 'Prueba', price: 10, category: 'entradas' });
      expect(res.status).toBe(403);
    });
    it('cook intenta crear plato → 403', async () => {
      const res = await request(app)
        .post('/api/menu')
        .set('Authorization', `Bearer ${cookToken}`)
        .send({ name: 'Prueba', price: 10, category: 'entradas' });
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/tables/waiters — solo manager', () => {
    it('waiter intenta listar meseros → 403', async () => {
      const res = await request(app)
        .get('/api/tables/waiters')
        .set('Authorization', `Bearer ${waiterToken}`);
      expect(res.status).toBe(403);
    });
    it('cook intenta listar meseros → 403', async () => {
      const res = await request(app)
        .get('/api/tables/waiters')
        .set('Authorization', `Bearer ${cookToken}`);
      expect(res.status).toBe(403);
    });
    it('manager puede listar meseros', async () => {
      const res = await request(app)
        .get('/api/tables/waiters')
        .set('Authorization', `Bearer ${managerToken}`);
      expect(res.status).toBe(200);
    });
  });

  describe('PATCH /api/tables/:id — solo waiter/manager', () => {
    it('cook intenta cambiar estado de mesa → 403', async () => {
      const res = await request(app)
        .patch('/api/tables/t1')
        .set('Authorization', `Bearer ${cookToken}`)
        .send({ status: 'occupied' });
      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/caja/open — solo manager', () => {
    it('waiter intenta abrir caja → 403', async () => {
      const res = await request(app)
        .post('/api/caja/open')
        .set('Authorization', `Bearer ${waiterToken}`);
      expect(res.status).toBe(403);
    });
    it('cook intenta abrir caja → 403', async () => {
      const res = await request(app)
        .post('/api/caja/open')
        .set('Authorization', `Bearer ${cookToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/caja — solo manager', () => {
    it('waiter intenta ver historial de caja → 403', async () => {
      const res = await request(app)
        .get('/api/caja')
        .set('Authorization', `Bearer ${waiterToken}`);
      expect(res.status).toBe(403);
    });
    it('manager puede ver historial de caja', async () => {
      const res = await request(app)
        .get('/api/caja')
        .set('Authorization', `Bearer ${managerToken}`);
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/kitchen/stats — solo cook/manager', () => {
    it('waiter intenta ver estadísticas de cocina → 403', async () => {
      const res = await request(app)
        .get('/api/kitchen/stats')
        .set('Authorization', `Bearer ${waiterToken}`);
      expect(res.status).toBe(403);
    });
    it('cook puede ver estadísticas de cocina', async () => {
      const res = await request(app)
        .get('/api/kitchen/stats')
        .set('Authorization', `Bearer ${cookToken}`);
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/ai/delay-check — solo waiter/manager', () => {
    it('cook intenta ver alertas de demoras → 403', async () => {
      const res = await request(app)
        .get('/api/ai/delay-check')
        .set('Authorization', `Bearer ${cookToken}`);
      expect(res.status).toBe(403);
    });
    it('waiter puede ver alertas de demoras', async () => {
      const res = await request(app)
        .get('/api/ai/delay-check')
        .set('Authorization', `Bearer ${waiterToken}`);
      // 200 o error de IA (500), pero no 401/403
      expect([200, 500]).toContain(res.status);
    });
  });

  describe('GET /api/ai/shift-summary — solo manager', () => {
    it('waiter intenta ver resumen de turno → 403', async () => {
      const res = await request(app)
        .get('/api/ai/shift-summary')
        .set('Authorization', `Bearer ${waiterToken}`);
      expect(res.status).toBe(403);
    });
    it('cook intenta ver resumen de turno → 403', async () => {
      const res = await request(app)
        .get('/api/ai/shift-summary')
        .set('Authorization', `Bearer ${cookToken}`);
      expect(res.status).toBe(403);
    });
  });
});
