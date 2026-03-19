import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../restaurante.db');

export const db = new Database(DB_PATH);

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

function seed() {
  const { c } = db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number };
  if (c > 0) return;

  const insertUser = db.prepare(
    'INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)'
  );
  const insertTable = db.prepare(
    'INSERT INTO tables (id, number, capacity, status) VALUES (?, ?, ?, ?)'
  );
  const insertItem = db.prepare(
    'INSERT INTO menu_items (id, name, description, price, category, available) VALUES (?, ?, ?, ?, ?, ?)'
  );

  db.transaction(() => {
    insertUser.run('u1', 'María López',  'mesero@restaurante.com',  '1234', 'waiter');
    insertUser.run('u2', 'Carlos Ruiz',  'cocina@restaurante.com',  '1234', 'cook');
    insertUser.run('u3', 'Ana García',   'gerente@restaurante.com', '1234', 'manager');

    const caps: Record<number, number> = { 1:2, 2:4, 3:4, 4:6, 5:2, 6:4, 7:6, 8:2, 9:4, 10:6 };
    for (let i = 1; i <= 10; i++) insertTable.run(`t${i}`, i, caps[i], 'free');

    // Entradas
    insertItem.run('m1',  'Ceviche Clásico',      'Corvina fresca en leche de tigre, cebolla roja, ají limo y choclo',           48, 'Entradas',    1);
    insertItem.run('m2',  'Ceviche Mixto',         'Corvina, camarones, pulpo y conchas negras. Leche de tigre al ají amarillo',  62, 'Entradas',    1);
    insertItem.run('m3',  'Leche de Tigre',        'Shot de cítrico con trozos de pescado, chochos y cancha serrana',             28, 'Entradas',    1);
    insertItem.run('m4',  'Tiradito de Lenguado',  'Láminas de lenguado en crema de ají amarillo con gotas de limón',             55, 'Entradas',    1);
    insertItem.run('m5',  'Causa Limeña',          'Papa amarilla rellena de atún o pollo con palta y huevo',                     38, 'Entradas',    1);
    insertItem.run('m6',  'Choros a la Chalaca',   'Mejillones frescos con salsa criolla, tomate y limón',                        42, 'Entradas',    1);
    insertItem.run('m7',  'Pulpo al Olivo',        'Pulpo tierno en salsa de aceitunas de botija con papas nativas',              65, 'Entradas',    1);
    // Principales
    insertItem.run('m8',  'Arroz con Mariscos',    'Arroz al cilantro con camarones, pulpo, mejillones y conchas negras',         88, 'Principales', 1);
    insertItem.run('m9',  'Jalea Mixta',           'Pescado, calamares y mariscos fritos con yuca, zarza criolla y salsa tártara',82, 'Principales', 1);
    insertItem.run('m10', 'Sudado de Pescado',     'Corvina entera en caldo criollo de tomate, ají panca y chicha de jora',       90, 'Principales', 1);
    insertItem.run('m11', 'Parihuela',             'Sopa marinera con mariscos, pescado y cangrejo en caldo especiado',           95, 'Principales', 1);
    insertItem.run('m12', 'Lomo Saltado',          'Res salteada con tomate, cebolla, sillao y papas fritas. Con arroz',          85, 'Principales', 1);
    insertItem.run('m13', 'Chaufa de Mariscos',    'Arroz chaufa salteado con camarones, pulpo, calamar y cebollita china',       78, 'Principales', 1);
    insertItem.run('m14', 'Pescado a lo Macho',    'Filete de corvina bañado en salsa mariscos y ají amarillo. Con arroz',        92, 'Principales', 0);
    // Postres
    insertItem.run('m15', 'Suspiro Limeño',        'Manjar blanco con merengue de oporto y canela',                               28, 'Postres',     1);
    insertItem.run('m16', 'Picarones',             'Buñuelos de zapallo y camote con miel de chancaca y clavo de olor (x4)',      24, 'Postres',     1);
    insertItem.run('m17', 'Mazamorra Morada',      'Postre tradicional de maíz morado con frutas y canela',                       22, 'Postres',     1);
    insertItem.run('m18', 'Arroz con Leche',       'Cremoso arroz con leche evaporada, canela y cáscara de naranja',              20, 'Postres',     1);
    // Bebidas
    insertItem.run('m19', 'Pisco Sour',            'Pisco quebranta, limón, clara de huevo y amargo de angostura',                32, 'Bebidas',     1);
    insertItem.run('m20', 'Chicha Morada',         'Bebida tradicional de maíz morado, piña, membrillo y canela. 1L',             22, 'Bebidas',     1);
    insertItem.run('m21', 'Inca Kola',             'Gaseosa nacional. Personal 350ml',                                            12, 'Bebidas',     1);
    insertItem.run('m22', 'Agua mineral',          'San Mateo 625ml, con o sin gas',                                              10, 'Bebidas',     1);
    insertItem.run('m23', 'Cerveza Cristal',       'Botella 620ml bien fría',                                                     18, 'Bebidas',     1);
    insertItem.run('m24', 'Limonada Frozen',       'Limón sutil, hielo frappe y azúcar. Tamaño personal',                        16, 'Bebidas',     1);
  })();
}

seed();
