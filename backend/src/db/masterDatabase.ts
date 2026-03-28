/**
 * masterDatabase.ts
 * Base de datos principal del sistema SaaS.
 * Almacena tenants (restaurantes) y usuarios webmaster.
 * Completamente separada de las DBs de cada tenant.
 */
import Database from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const MASTER_DB_PATH = process.env.MASTER_DB_PATH || path.join(DATA_DIR, 'master.db');

// En tests usamos la misma DB en memoria para no necesitar archivos
const isTest = process.env.NODE_ENV === 'test';
export const masterDb = new Database(isTest ? ':memory:' : MASTER_DB_PATH);

masterDb.pragma('journal_mode = WAL');

masterDb.exec(`
  CREATE TABLE IF NOT EXISTS tenants (
    id                    TEXT PRIMARY KEY,
    slug                  TEXT UNIQUE NOT NULL,
    name                  TEXT NOT NULL,
    status                TEXT NOT NULL DEFAULT 'active',
    plan                  TEXT NOT NULL DEFAULT 'basic',
    admin_email           TEXT NOT NULL,
    dodo_customer_id      TEXT,
    dodo_subscription_id  TEXT,
    dodo_subscription_status TEXT,
    trial_ends_at         TEXT,
    created_at            TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS webmaster_users (
    id       TEXT PRIMARY KEY,
    name     TEXT NOT NULL,
    email    TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  );
`);

// Seed: crear webmaster por defecto si no existe
(function seedMaster() {
  const { c } = masterDb.prepare('SELECT COUNT(*) as c FROM webmaster_users').get() as { c: number };
  if (c > 0) return;

  const defaultEmail = process.env.WEBMASTER_EMAIL || 'admin@miapp.com';
  const defaultPass  = process.env.WEBMASTER_PASSWORD || 'webmaster1234';
  masterDb.prepare('INSERT INTO webmaster_users (id, name, email, password) VALUES (?, ?, ?, ?)')
    .run('wm1', 'Webmaster', defaultEmail, bcrypt.hashSync(defaultPass, 10));

  // En desarrollo también crear un tenant demo si no existe
  if (process.env.NODE_ENV !== 'production') {
    masterDb.prepare(
      `INSERT OR IGNORE INTO tenants (id, slug, name, status, plan, admin_email, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run('t_demo', 'demo', 'Restaurante Demo', 'active', 'basic', 'demo@restaurante.com', new Date().toISOString());
  }
})();

// ── TENANT QUERIES ──────────────────────────────────────────

export interface Tenant {
  id:                    string;
  slug:                  string;
  name:                  string;
  status:                'active' | 'suspended' | 'trial';
  plan:                  string;
  admin_email:           string;
  dodo_customer_id:      string | null;
  dodo_subscription_id:  string | null;
  dodo_subscription_status: string | null;
  trial_ends_at:         string | null;
  created_at:            string;
}

export interface WebmasterUser {
  id:       string;
  name:     string;
  email:    string;
  password: string;
}

export const masterStore = {
  // Tenants
  getAllTenants(): Tenant[] {
    return masterDb.prepare('SELECT * FROM tenants ORDER BY created_at DESC').all() as Tenant[];
  },

  getTenantBySlug(slug: string): Tenant | undefined {
    return masterDb.prepare('SELECT * FROM tenants WHERE slug = ?').get(slug) as Tenant | undefined;
  },

  getTenantById(id: string): Tenant | undefined {
    return masterDb.prepare('SELECT * FROM tenants WHERE id = ?').get(id) as Tenant | undefined;
  },

  createTenant(data: Omit<Tenant, 'id' | 'created_at' | 'dodo_customer_id' | 'dodo_subscription_id' | 'dodo_subscription_status' | 'trial_ends_at'>): Tenant {
    const id = `t_${Date.now()}`;
    const created_at = new Date().toISOString();
    masterDb.prepare(
      `INSERT INTO tenants (id, slug, name, status, plan, admin_email, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, data.slug, data.name, data.status, data.plan, data.admin_email, created_at);
    return masterStore.getTenantById(id)!;
  },

  updateTenant(id: string, fields: Partial<Omit<Tenant, 'id' | 'created_at'>>): Tenant | undefined {
    const sets: string[] = [];
    const values: any[]  = [];
    if (fields.name   !== undefined) { sets.push('name = ?');   values.push(fields.name); }
    if (fields.status !== undefined) { sets.push('status = ?'); values.push(fields.status); }
    if (fields.plan   !== undefined) { sets.push('plan = ?');   values.push(fields.plan); }
    if (fields.dodo_customer_id     !== undefined) { sets.push('dodo_customer_id = ?');     values.push(fields.dodo_customer_id); }
    if (fields.dodo_subscription_id !== undefined) { sets.push('dodo_subscription_id = ?'); values.push(fields.dodo_subscription_id); }
    if (fields.dodo_subscription_status !== undefined) { sets.push('dodo_subscription_status = ?'); values.push(fields.dodo_subscription_status); }
    if (fields.trial_ends_at !== undefined) { sets.push('trial_ends_at = ?'); values.push(fields.trial_ends_at); }
    if (sets.length === 0) return masterStore.getTenantById(id);
    values.push(id);
    masterDb.prepare(`UPDATE tenants SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    return masterStore.getTenantById(id);
  },

  deleteTenant(id: string): void {
    masterDb.prepare('DELETE FROM tenants WHERE id = ?').run(id);
  },

  slugExists(slug: string): boolean {
    const row = masterDb.prepare('SELECT 1 FROM tenants WHERE slug = ?').get(slug);
    return !!row;
  },

  // Webmaster users
  getWebmasterByEmail(email: string): WebmasterUser | undefined {
    return masterDb.prepare('SELECT * FROM webmaster_users WHERE email = ?').get(email) as WebmasterUser | undefined;
  },
};
