/**
 * tenantPool.ts
 * Gestiona conexiones SQLite por tenant.
 * Cada restaurante tiene su propia DB aislada.
 */
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

export const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');

/**
 * Inicializa el schema completo de un tenant en la DB dada.
 * Idempotente: usa CREATE TABLE IF NOT EXISTS + ALTER TABLE con try-catch.
 */
export function initTenantSchema(db: Database.Database): void {
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id       TEXT PRIMARY KEY,
      name     TEXT NOT NULL,
      email    TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role     TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tables (
      id                  TEXT PRIMARY KEY,
      number              INTEGER UNIQUE NOT NULL,
      capacity            INTEGER NOT NULL,
      status              TEXT NOT NULL DEFAULT 'free',
      last_interaction_at TEXT
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      description TEXT NOT NULL,
      price       REAL NOT NULL,
      category    TEXT NOT NULL,
      available   INTEGER NOT NULL DEFAULT 1,
      image_url   TEXT
    );

    CREATE TABLE IF NOT EXISTS orders (
      id           TEXT PRIMARY KEY,
      table_id     TEXT NOT NULL,
      waiter_id    TEXT NOT NULL,
      status       TEXT NOT NULL DEFAULT 'open',
      created_at   TEXT NOT NULL,
      delivered_at TEXT,
      FOREIGN KEY (table_id) REFERENCES tables(id)
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id           TEXT PRIMARY KEY,
      order_id     TEXT NOT NULL,
      menu_item_id TEXT NOT NULL,
      quantity     INTEGER NOT NULL DEFAULT 1,
      notes        TEXT,
      status       TEXT NOT NULL DEFAULT 'pending',
      FOREIGN KEY (order_id)     REFERENCES orders(id),
      FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
    );

    CREATE TABLE IF NOT EXISTS promotions (
      id           TEXT PRIMARY KEY,
      name         TEXT NOT NULL,
      type         TEXT NOT NULL,
      value        REAL NOT NULL DEFAULT 0,
      applies_to   TEXT NOT NULL,
      target_id    TEXT,
      days_of_week TEXT NOT NULL,
      time_start   TEXT NOT NULL,
      time_end     TEXT NOT NULL,
      active       INTEGER NOT NULL DEFAULT 1,
      created_at   TEXT NOT NULL
    );
  `);

  // Migraciones aditivas (idempotentes)
  try { db.exec(`ALTER TABLE order_items ADD COLUMN effective_price REAL`); } catch {}
  try { db.exec(`ALTER TABLE order_items ADD COLUMN round INTEGER NOT NULL DEFAULT 1`); } catch {}
  try { db.exec(`ALTER TABLE menu_items ADD COLUMN stock INTEGER`); } catch {}
  try { db.exec(`ALTER TABLE tables ADD COLUMN assigned_waiter_id TEXT REFERENCES users(id)`); } catch {}
  try { db.exec(`ALTER TABLE orders ADD COLUMN caja_session_id TEXT`); } catch {}
  try { db.exec(`ALTER TABLE orders ADD COLUMN cashier_id TEXT`); } catch {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS caja_sessions (
      id           TEXT PRIMARY KEY,
      cashier_id   TEXT NOT NULL,
      cashier_name TEXT NOT NULL,
      opened_at    TEXT NOT NULL,
      closed_at    TEXT,
      FOREIGN KEY (cashier_id) REFERENCES users(id)
    );
  `);
}

/**
 * Seed inicial de un nuevo tenant: usuario manager, mesas y menú de ejemplo.
 */
export function seedTenantDb(db: Database.Database, managerEmail: string, managerPassword: string): void {
  const { c } = db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number };
  if (c > 0) return; // ya tiene datos, no re-seedear

  const hash = bcrypt.hashSync(managerPassword, 10);

  db.transaction(() => {
    // Usuario manager
    db.prepare('INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)')
      .run('u1', 'Gerente', managerEmail, hash, 'manager');

    // Mesas por defecto
    const caps: Record<number, number> = { 1:2, 2:4, 3:4, 4:6, 5:2, 6:4, 7:6, 8:2, 9:4, 10:6 };
    for (let i = 1; i <= 10; i++) {
      db.prepare('INSERT INTO tables (id, number, capacity, status) VALUES (?, ?, ?, ?)')
        .run(`t${i}`, i, caps[i], 'free');
    }

    // Menú de ejemplo (básico)
    const insertItem = db.prepare(
      'INSERT INTO menu_items (id, name, description, price, category, available) VALUES (?, ?, ?, ?, ?, ?)'
    );
    insertItem.run('m1', 'Plato del día',   'Consultar con el mesero',   45, 'Principales', 1);
    insertItem.run('m2', 'Entrada variada', 'Selección del chef',        28, 'Entradas',    1);
    insertItem.run('m3', 'Refresco',        'Bebida natural de la casa',  12, 'Bebidas',     1);
    insertItem.run('m4', 'Postre del día',  'Consultar disponibilidad',  18, 'Postres',     1);
  })();
}

// ── Pool de conexiones ─────────────────────────────────────

class TenantDbPool {
  private pool: Map<string, Database.Database> = new Map();

  /**
   * Obtiene (o crea y cachea) la conexión DB para un tenant.
   */
  getDb(slug: string): Database.Database {
    if (!this.pool.has(slug)) {
      const dbPath = this.getDbPath(slug);
      const db = new Database(dbPath);
      initTenantSchema(db);
      this.pool.set(slug, db);
    }
    return this.pool.get(slug)!;
  }

  /**
   * Provisiona un nuevo tenant: crea directorio, DB, schema y seed.
   * @param managerPassword Contraseña en texto plano. Si no se provee se genera una temporal.
   * @returns La contraseña usada (para mostrarla al webmaster si fue generada)
   */
  provisionTenant(slug: string, managerEmail: string, managerPassword?: string): string {
    const tenantDir = path.join(DATA_DIR, 'tenants', slug);
    fs.mkdirSync(tenantDir, { recursive: true });

    const password = managerPassword ?? `${slug}-${Math.random().toString(36).slice(2, 8)}`;
    const db = this.getDb(slug);
    seedTenantDb(db, managerEmail, password);
    return password;
  }

  private getDbPath(slug: string): string {
    const tenantDir = path.join(DATA_DIR, 'tenants', slug);
    fs.mkdirSync(tenantDir, { recursive: true });
    return path.join(tenantDir, 'restaurante.db');
  }

  closeDb(slug: string): void {
    this.pool.get(slug)?.close();
    this.pool.delete(slug);
  }

  closeAll(): void {
    this.pool.forEach(db => db.close());
    this.pool.clear();
  }
}

export const tenantPool = new TenantDbPool();

// ── Test helpers ───────────────────────────────────────────

/**
 * DB en memoria para tests — misma instancia para todos los tests del proceso.
 */
let _testDb: Database.Database | null = null;

export function getTestDb(): Database.Database {
  if (!_testDb) {
    _testDb = new Database(':memory:');
    initTenantSchema(_testDb);
    seedTestDb(_testDb);
  }
  return _testDb;
}

function seedTestDb(db: Database.Database): void {
  const hash = bcrypt.hashSync('1234', 10);
  db.prepare('INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)')
    .run('u1', 'María López',  'mesero@restaurante.com',  hash, 'waiter');
  db.prepare('INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)')
    .run('u2', 'Carlos Ruiz',  'cocina@restaurante.com',  hash, 'cook');
  db.prepare('INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)')
    .run('u3', 'Ana García',   'gerente@restaurante.com', hash, 'manager');

  const caps: Record<number, number> = { 1:2, 2:4, 3:4, 4:6, 5:2, 6:4, 7:6, 8:2, 9:4, 10:6 };
  for (let i = 1; i <= 10; i++) {
    db.prepare('INSERT INTO tables (id, number, capacity, status) VALUES (?, ?, ?, ?)')
      .run(`t${i}`, i, caps[i], 'free');
  }

  const insertItem = db.prepare(
    'INSERT INTO menu_items (id, name, description, price, category, available) VALUES (?, ?, ?, ?, ?, ?)'
  );
  insertItem.run('m1',  'Ceviche Clásico',   'Corvina fresca',           48, 'Entradas',    1);
  insertItem.run('m2',  'Ceviche Mixto',     'Corvina y mariscos',       62, 'Entradas',    1);
  insertItem.run('m8',  'Arroz con Mariscos','Arroz al cilantro',        88, 'Principales', 1);
  insertItem.run('m19', 'Pisco Sour',        'Pisco quebranta',          32, 'Bebidas',     1);
}
