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

    insertItem.run('m1',  'Ceviche Clásico',     'Pescado fresco en limón con cilantro',       45, 'Entradas',    1);
    insertItem.run('m2',  'Tequeños',            'Masa con queso derretido x6',                35, 'Entradas',    1);
    insertItem.run('m3',  'Ensalada César',      'Lechuga romana, crutones, parmesano',        40, 'Entradas',    1);
    insertItem.run('m4',  'Lomo Saltado',        'Res salteada con papas y arroz',             85, 'Principales', 1);
    insertItem.run('m5',  'Pollo a la Brasa',    '1/4 de pollo con papas y ensalada',          75, 'Principales', 1);
    insertItem.run('m6',  'Pasta Alfredo',       'Fettuccine en crema con champiñones',        65, 'Principales', 1);
    insertItem.run('m7',  'Hamburguesa Clásica', 'Carne 180g, queso, lechuga, tomate',         70, 'Principales', 1);
    insertItem.run('m8',  'Arroz con Mariscos',  'Arroz cremoso con camarones y mejillones',   95, 'Principales', 0);
    insertItem.run('m9',  'Tiramisú',            'Clásico italiano con café',                  35, 'Postres',     1);
    insertItem.run('m10', 'Cheesecake',          'Con coulis de frutos rojos',                 30, 'Postres',     1);
    insertItem.run('m11', 'Brownie con helado',  'Brownie tibio con helado de vainilla',       28, 'Postres',     1);
    insertItem.run('m12', 'Agua mineral',        '500ml con o sin gas',                        12, 'Bebidas',     1);
    insertItem.run('m13', 'Jugo natural',        'Naranja, mango o maracuyá',                 20, 'Bebidas',     1);
    insertItem.run('m14', 'Gaseosa',             'Lata 350ml',                                 15, 'Bebidas',     1);
    insertItem.run('m15', 'Café americano',      'Grano de origen',                            18, 'Bebidas',     1);
  })();
}

seed();
