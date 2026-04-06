/**
 * tenancy.test.ts
 * Tests para la capa de multi-tenancy:
 * - masterStore: CRUD de tenants en la DB principal
 * - initTenantSchema: estructura de tablas en DB de tenant
 * - seedTenantDb: seed inicial (manager, mesas, menú)
 * - Aislamiento de datos entre tenants
 */
import { describe, it, expect, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { masterStore } from '../db/masterDatabase';
import { initTenantSchema, seedTenantDb } from '../db/tenantPool';

const TEST_SLUG = 'tenancy-test-xyz';

// ── masterStore ────────────────────────────────────────────────────────────────

describe('masterStore — CRUD de tenants', () => {
  afterEach(() => {
    const t = masterStore.getTenantBySlug(TEST_SLUG);
    if (t) masterStore.deleteTenant(t.id);
  });

  it('createTenant crea un tenant con los campos correctos', () => {
    const tenant = masterStore.createTenant({
      slug:        TEST_SLUG,
      name:        'Restaurante Test',
      admin_email: 'admin@test.com',
      plan:        'basic',
      status:      'active',
    });
    expect(tenant.slug).toBe(TEST_SLUG);
    expect(tenant.name).toBe('Restaurante Test');
    expect(tenant.status).toBe('active');
    expect(tenant.plan).toBe('basic');
    expect(tenant.id).toBeDefined();
    expect(tenant.created_at).toBeDefined();
  });

  it('getTenantBySlug retorna el tenant correcto', () => {
    const created = masterStore.createTenant({
      slug:        TEST_SLUG,
      name:        'Restaurante Test',
      admin_email: 'admin@test.com',
      plan:        'basic',
      status:      'active',
    });
    const found = masterStore.getTenantBySlug(TEST_SLUG);
    expect(found).toBeDefined();
    expect(found!.id).toBe(created.id);
    expect(found!.slug).toBe(TEST_SLUG);
  });

  it('getTenantBySlug retorna undefined para slug inexistente', () => {
    const found = masterStore.getTenantBySlug('slug-que-no-existe-abc');
    expect(found).toBeUndefined();
  });

  it('slugExists retorna true para slug ocupado', () => {
    masterStore.createTenant({
      slug:        TEST_SLUG,
      name:        'Restaurante Test',
      admin_email: 'admin@test.com',
      plan:        'basic',
      status:      'active',
    });
    expect(masterStore.slugExists(TEST_SLUG)).toBe(true);
  });

  it('slugExists retorna false para slug disponible', () => {
    expect(masterStore.slugExists('slug-disponible-xyz-123')).toBe(false);
  });

  it('updateTenant cambia el status a active', () => {
    const tenant = masterStore.createTenant({
      slug:        TEST_SLUG,
      name:        'Restaurante Test',
      admin_email: 'admin@test.com',
      plan:        'basic',
      status:      'trial',
    });
    masterStore.updateTenant(tenant.id, { status: 'active' });
    const updated = masterStore.getTenantById(tenant.id);
    expect(updated!.status).toBe('active');
  });

  it('updateTenant cambia el status a suspended', () => {
    const tenant = masterStore.createTenant({
      slug:        TEST_SLUG,
      name:        'Restaurante Test',
      admin_email: 'admin@test.com',
      plan:        'basic',
      status:      'active',
    });
    masterStore.updateTenant(tenant.id, { status: 'suspended' });
    const updated = masterStore.getTenantById(tenant.id);
    expect(updated!.status).toBe('suspended');
  });

  it('updateTenant puede almacenar datos de DodoPayments', () => {
    const tenant = masterStore.createTenant({
      slug:        TEST_SLUG,
      name:        'Restaurante Test',
      admin_email: 'admin@test.com',
      plan:        'basic',
      status:      'trial',
    });
    masterStore.updateTenant(tenant.id, {
      dodo_customer_id:         'cus_test123',
      dodo_subscription_id:     'sub_test456',
      dodo_subscription_status: 'active',
    });
    const updated = masterStore.getTenantById(tenant.id);
    expect(updated!.dodo_customer_id).toBe('cus_test123');
    expect(updated!.dodo_subscription_id).toBe('sub_test456');
    expect(updated!.dodo_subscription_status).toBe('active');
  });

  it('deleteTenant elimina el tenant de la DB', () => {
    const tenant = masterStore.createTenant({
      slug:        TEST_SLUG,
      name:        'Restaurante Test',
      admin_email: 'admin@test.com',
      plan:        'basic',
      status:      'active',
    });
    masterStore.deleteTenant(tenant.id);
    expect(masterStore.getTenantBySlug(TEST_SLUG)).toBeUndefined();
    expect(masterStore.getTenantById(tenant.id)).toBeUndefined();
  });

  it('slug es único — no puede existir dos tenants con el mismo slug', () => {
    masterStore.createTenant({
      slug:        TEST_SLUG,
      name:        'Restaurante Test',
      admin_email: 'admin@test.com',
      plan:        'basic',
      status:      'active',
    });
    expect(() => {
      masterStore.createTenant({
        slug:        TEST_SLUG,
        name:        'Duplicado',
        admin_email: 'otro@test.com',
        plan:        'basic',
        status:      'active',
      });
    }).toThrow();
  });
});

// ── initTenantSchema ───────────────────────────────────────────────────────────

describe('initTenantSchema — estructura de tablas', () => {
  it('crea todas las tablas requeridas en una DB limpia', () => {
    const db = new Database(':memory:');
    initTenantSchema(db);

    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).all() as { name: string }[];
    const names = tables.map(t => t.name);

    expect(names).toContain('users');
    expect(names).toContain('tables');
    expect(names).toContain('menu_items');
    expect(names).toContain('orders');
    expect(names).toContain('order_items');
    expect(names).toContain('promotions');
    expect(names).toContain('caja_sessions');
    db.close();
  });

  it('orders tiene la columna caja_session_id (migración)', () => {
    const db = new Database(':memory:');
    initTenantSchema(db);

    const cols = db.prepare("PRAGMA table_info(orders)").all() as { name: string }[];
    const colNames = cols.map(c => c.name);
    expect(colNames).toContain('caja_session_id');
    expect(colNames).toContain('cashier_id');
    db.close();
  });

  it('menu_items tiene la columna stock (migración)', () => {
    const db = new Database(':memory:');
    initTenantSchema(db);

    const cols = db.prepare("PRAGMA table_info(menu_items)").all() as { name: string }[];
    const colNames = cols.map(c => c.name);
    expect(colNames).toContain('stock');
    db.close();
  });

  it('order_items tiene las columnas effective_price y round (migraciones)', () => {
    const db = new Database(':memory:');
    initTenantSchema(db);

    const cols = db.prepare("PRAGMA table_info(order_items)").all() as { name: string }[];
    const colNames = cols.map(c => c.name);
    expect(colNames).toContain('effective_price');
    expect(colNames).toContain('round');
    db.close();
  });

  it('es idempotente — ejecutar dos veces no lanza error', () => {
    const db = new Database(':memory:');
    expect(() => {
      initTenantSchema(db);
      initTenantSchema(db);
    }).not.toThrow();
    db.close();
  });
});

// ── seedTenantDb ───────────────────────────────────────────────────────────────

describe('seedTenantDb — datos iniciales del tenant', () => {
  it('crea 1 usuario manager con el email y rol correctos', () => {
    const db = new Database(':memory:');
    initTenantSchema(db);
    seedTenantDb(db, 'gerente@mirestaur.com', 'password123');

    const users = db.prepare('SELECT * FROM users').all() as any[];
    expect(users).toHaveLength(1);
    expect(users[0].email).toBe('gerente@mirestaur.com');
    expect(users[0].role).toBe('manager');
    expect(users[0].password).not.toBe('password123'); // debe estar hasheada
    db.close();
  });

  it('crea 10 mesas por defecto todas en estado free', () => {
    const db = new Database(':memory:');
    initTenantSchema(db);
    seedTenantDb(db, 'gerente@mirestaur.com', 'password123');

    const tables = db.prepare('SELECT * FROM tables').all() as any[];
    expect(tables).toHaveLength(10);
    tables.forEach(t => expect(t.status).toBe('free'));
    db.close();
  });

  it('crea 4 items de menú por defecto todos disponibles', () => {
    const db = new Database(':memory:');
    initTenantSchema(db);
    seedTenantDb(db, 'gerente@mirestaur.com', 'password123');

    const items = db.prepare('SELECT * FROM menu_items').all() as any[];
    expect(items).toHaveLength(4);
    items.forEach(i => expect(i.available).toBe(1));
    db.close();
  });

  it('es idempotente — no re-seedea si ya hay datos', () => {
    const db = new Database(':memory:');
    initTenantSchema(db);
    seedTenantDb(db, 'gerente1@test.com', 'password123');
    seedTenantDb(db, 'gerente2@test.com', 'password456'); // segunda vez no debe agregar

    const users = db.prepare('SELECT * FROM users').all() as any[];
    expect(users).toHaveLength(1);
    expect(users[0].email).toBe('gerente1@test.com'); // solo el primero
    db.close();
  });
});

// ── Aislamiento de datos ───────────────────────────────────────────────────────

describe('Aislamiento de datos entre tenants', () => {
  it('dos DBs son completamente independientes', () => {
    const db1 = new Database(':memory:');
    const db2 = new Database(':memory:');
    initTenantSchema(db1);
    initTenantSchema(db2);
    seedTenantDb(db1, 'tenant1@test.com', 'password1');
    seedTenantDb(db2, 'tenant2@test.com', 'password2');

    const users1 = db1.prepare('SELECT email FROM users').all() as any[];
    const users2 = db2.prepare('SELECT email FROM users').all() as any[];

    expect(users1[0].email).toBe('tenant1@test.com');
    expect(users2[0].email).toBe('tenant2@test.com');
    expect(users1[0].email).not.toBe(users2[0].email);

    db1.close();
    db2.close();
  });

  it('insertar datos en un tenant no afecta al otro', () => {
    const db1 = new Database(':memory:');
    const db2 = new Database(':memory:');
    initTenantSchema(db1);
    initTenantSchema(db2);

    // Insertar un usuario extra solo en db1
    db1.prepare(
      'INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)'
    ).run('extra1', 'Extra', 'extra@db1.com', 'hash', 'waiter');

    const users1 = db1.prepare('SELECT * FROM users').all() as any[];
    const users2 = db2.prepare('SELECT * FROM users').all() as any[];

    expect(users1).toHaveLength(1);
    expect(users2).toHaveLength(0); // db2 no se ve afectada

    db1.close();
    db2.close();
  });
});
