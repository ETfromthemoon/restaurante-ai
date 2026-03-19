import { db } from './database';
import { User, Table, MenuItem, Order, OrderItem, OrderItemStatus, Promotion, CajaSession } from '../types';

// ── helpers ───────────────────────────────────────────────
function mapMenuItem(row: any): MenuItem {
  return { ...row, available: row.available === 1 };
}

// ── USERS ─────────────────────────────────────────────────
export function getUserByEmail(email: string): User | undefined {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;
}

export function getWaiters(): User[] {
  return db.prepare("SELECT * FROM users WHERE role = 'waiter'").all() as User[];
}

// ── TABLES ────────────────────────────────────────────────
export function getTables(): Table[] {
  return db.prepare('SELECT * FROM tables').all() as Table[];
}

export function getTableById(id: string): Table | undefined {
  return db.prepare('SELECT * FROM tables WHERE id = ?').get(id) as Table | undefined;
}

export function updateTable(
  id: string,
  fields: Partial<Pick<Table, 'status' | 'last_interaction_at' | 'assigned_waiter_id'>>
): void {
  const sets: string[] = [];
  const values: any[]  = [];

  if (fields.status !== undefined) {
    sets.push('status = ?');
    values.push(fields.status);
  }
  if ('last_interaction_at' in fields) {
    sets.push('last_interaction_at = ?');
    values.push(fields.last_interaction_at ?? null);
  }
  if ('assigned_waiter_id' in fields) {
    sets.push('assigned_waiter_id = ?');
    values.push(fields.assigned_waiter_id ?? null);
  }

  if (sets.length === 0) return;
  values.push(id);
  db.prepare(`UPDATE tables SET ${sets.join(', ')} WHERE id = ?`).run(...values);
}

// ── MENU ITEMS ────────────────────────────────────────────
export function getMenuItems(): MenuItem[] {
  return (db.prepare('SELECT * FROM menu_items').all() as any[]).map(mapMenuItem);
}

export function getMenuItemById(id: string): MenuItem | undefined {
  const row = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(id) as any;
  return row ? mapMenuItem(row) : undefined;
}

// ── ORDERS ────────────────────────────────────────────────
export function getOrders(status?: string): Order[] {
  const rows = status
    ? db.prepare('SELECT * FROM orders WHERE status = ?').all(status)
    : db.prepare('SELECT * FROM orders').all();
  return rows as Order[];
}

export function getOrderById(id: string): Order | undefined {
  return db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as Order | undefined;
}

export function getActiveOrderByTable(tableId: string): Order | undefined {
  return db.prepare(
    `SELECT * FROM orders
     WHERE table_id = ? AND status IN ('open','kitchen','ready','billing')
     LIMIT 1`
  ).get(tableId) as Order | undefined;
}

export function insertOrder(order: Omit<Order, 'items' | 'table'>): void {
  db.prepare(
    `INSERT INTO orders (id, table_id, waiter_id, status, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(order.id, order.table_id, order.waiter_id, order.status, order.created_at);
}

export function updateOrder(
  id: string,
  fields: Partial<Pick<Order, 'status' | 'delivered_at' | 'caja_session_id' | 'cashier_id'>>
): void {
  const sets: string[] = [];
  const values: any[]  = [];

  if (fields.status           !== undefined) { sets.push('status = ?');           values.push(fields.status); }
  if (fields.delivered_at     !== undefined) { sets.push('delivered_at = ?');     values.push(fields.delivered_at); }
  if ('caja_session_id' in fields)           { sets.push('caja_session_id = ?');  values.push(fields.caja_session_id ?? null); }
  if ('cashier_id' in fields)               { sets.push('cashier_id = ?');        values.push(fields.cashier_id ?? null); }

  if (sets.length === 0) return;
  values.push(id);
  db.prepare(`UPDATE orders SET ${sets.join(', ')} WHERE id = ?`).run(...values);
}

// ── ORDER ITEMS ───────────────────────────────────────────
export function getItemsByOrderId(orderId: string): OrderItem[] {
  return db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId) as OrderItem[];
}

export function getOrderItemById(itemId: string): OrderItem | undefined {
  return db.prepare('SELECT * FROM order_items WHERE id = ?').get(itemId) as OrderItem | undefined;
}

export function insertOrderItem(item: Omit<OrderItem, 'menu_item'>): void {
  db.prepare(
    `INSERT INTO order_items (id, order_id, menu_item_id, quantity, notes, status, effective_price, round)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(item.id, item.order_id, item.menu_item_id, item.quantity, item.notes ?? null, item.status, item.effective_price ?? null, item.round ?? 1);
}

export function getCurrentRound(orderId: string): number {
  const row = db.prepare('SELECT MAX(round) as r FROM order_items WHERE order_id = ?').get(orderId) as { r: number | null };
  return row.r ?? 1;
}

export function getOrdersByTable(tableId: string): Order[] {
  return db.prepare('SELECT * FROM orders WHERE table_id = ? ORDER BY created_at DESC').all(tableId) as Order[];
}

export function deleteOrderItem(itemId: string): void {
  db.prepare('DELETE FROM order_items WHERE id = ?').run(itemId);
}

export function updateOrderItemStatus(itemId: string, status: OrderItemStatus): void {
  db.prepare('UPDATE order_items SET status = ? WHERE id = ?').run(status, itemId);
}

export function updateOrderItemQuantity(itemId: string, quantity: number, effectivePrice?: number | null): void {
  db.prepare('UPDATE order_items SET quantity = ?, effective_price = ? WHERE id = ?')
    .run(quantity, effectivePrice ?? null, itemId);
}

// ── MENU ITEMS CRUD ───────────────────────────────────────
export function createMenuItem(item: Omit<MenuItem, 'id'>): MenuItem {
  const id = `m${Date.now()}`;
  db.prepare(
    `INSERT INTO menu_items (id, name, description, price, category, available, image_url, stock)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, item.name, item.description, item.price, item.category, item.available ? 1 : 0, item.image_url ?? null, item.stock ?? null);
  return getMenuItemById(id)!;
}

export function updateMenuItem(id: string, fields: Partial<Omit<MenuItem, 'id'>>): MenuItem | undefined {
  const sets: string[] = [];
  const values: any[]  = [];

  if (fields.name        !== undefined) { sets.push('name = ?');        values.push(fields.name); }
  if (fields.description !== undefined) { sets.push('description = ?'); values.push(fields.description); }
  if (fields.price       !== undefined) { sets.push('price = ?');       values.push(fields.price); }
  if (fields.category    !== undefined) { sets.push('category = ?');    values.push(fields.category); }
  if (fields.available   !== undefined) { sets.push('available = ?');   values.push(fields.available ? 1 : 0); }
  if ('stock' in fields)               { sets.push('stock = ?');        values.push(fields.stock ?? null); }

  if (sets.length === 0) return getMenuItemById(id);
  values.push(id);
  db.prepare(`UPDATE menu_items SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  return getMenuItemById(id);
}

// ── PROMOTIONS ───────────────────────────────────────────
function parsePromo(row: any): Promotion {
  return { ...row, days_of_week: JSON.parse(row.days_of_week), active: !!row.active };
}

export function getPromotions(): Promotion[] {
  return (db.prepare('SELECT * FROM promotions ORDER BY created_at DESC').all() as any[]).map(parsePromo);
}

export function getActivePromotions(): Promotion[] {
  return (db.prepare('SELECT * FROM promotions WHERE active=1').all() as any[]).map(parsePromo);
}

export function insertPromotion(p: Omit<Promotion, 'id'>): Promotion {
  const id = `promo${Date.now()}`;
  db.prepare(
    `INSERT INTO promotions (id, name, type, value, applies_to, target_id, days_of_week, time_start, time_end, active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, p.name, p.type, p.value, p.applies_to, p.target_id ?? null, JSON.stringify(p.days_of_week), p.time_start, p.time_end, p.active ? 1 : 0, p.created_at);
  return parsePromo(db.prepare('SELECT * FROM promotions WHERE id = ?').get(id));
}

export function updatePromotion(id: string, fields: Partial<Omit<Promotion, 'id'>>): Promotion {
  const sets: string[] = [];
  const values: any[]  = [];

  if (fields.name        !== undefined) { sets.push('name = ?');        values.push(fields.name); }
  if (fields.type        !== undefined) { sets.push('type = ?');        values.push(fields.type); }
  if (fields.value       !== undefined) { sets.push('value = ?');       values.push(fields.value); }
  if (fields.applies_to  !== undefined) { sets.push('applies_to = ?');  values.push(fields.applies_to); }
  if ('target_id' in fields)            { sets.push('target_id = ?');   values.push(fields.target_id ?? null); }
  if (fields.days_of_week !== undefined){ sets.push('days_of_week = ?');values.push(JSON.stringify(fields.days_of_week)); }
  if (fields.time_start  !== undefined) { sets.push('time_start = ?');  values.push(fields.time_start); }
  if (fields.time_end    !== undefined) { sets.push('time_end = ?');    values.push(fields.time_end); }
  if (fields.active      !== undefined) { sets.push('active = ?');      values.push(fields.active ? 1 : 0); }

  if (sets.length > 0) {
    values.push(id);
    db.prepare(`UPDATE promotions SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  }
  return parsePromo(db.prepare('SELECT * FROM promotions WHERE id = ?').get(id));
}

// ── INVENTARIO ────────────────────────────────────────────
export function adjustStock(menuItemId: string, delta: number): void {
  db.prepare('UPDATE menu_items SET stock = stock + ? WHERE id = ? AND stock IS NOT NULL').run(delta, menuItemId);
  const item = getMenuItemById(menuItemId);
  if (item && item.stock !== null && item.stock !== undefined) {
    if (item.stock <= 0) {
      db.prepare('UPDATE menu_items SET available = 0, stock = 0 WHERE id = ?').run(menuItemId);
    } else {
      db.prepare('UPDATE menu_items SET available = 1 WHERE id = ?').run(menuItemId);
    }
  }
}

// ── CAJA SESSIONS ─────────────────────────────────────────
export function getActiveCajaSession(): CajaSession | undefined {
  return db.prepare('SELECT * FROM caja_sessions WHERE closed_at IS NULL LIMIT 1').get() as CajaSession | undefined;
}

export function getCajaSessions(): CajaSession[] {
  return db.prepare('SELECT * FROM caja_sessions ORDER BY opened_at DESC').all() as CajaSession[];
}

export function getCajaSessionById(id: string): CajaSession | undefined {
  return db.prepare('SELECT * FROM caja_sessions WHERE id = ?').get(id) as CajaSession | undefined;
}

export function insertCajaSession(s: CajaSession): void {
  db.prepare('INSERT INTO caja_sessions (id, cashier_id, cashier_name, opened_at) VALUES (?, ?, ?, ?)')
    .run(s.id, s.cashier_id, s.cashier_name, s.opened_at);
}

export function closeCajaSession(id: string, closedAt: string): void {
  db.prepare('UPDATE caja_sessions SET closed_at = ? WHERE id = ?').run(closedAt, id);
}

// ── ID GENERATORS ─────────────────────────────────────────
export function nextOrderId(): string {
  const row = db.prepare(
    `SELECT id FROM orders WHERE id LIKE 'o%'
     ORDER BY CAST(SUBSTR(id, 2) AS INTEGER) DESC LIMIT 1`
  ).get() as { id: string } | undefined;
  return `o${row ? parseInt(row.id.slice(1)) + 1 : 1}`;
}

export function nextOrderItemId(): string {
  const row = db.prepare(
    `SELECT id FROM order_items WHERE id LIKE 'oi%'
     ORDER BY CAST(SUBSTR(id, 3) AS INTEGER) DESC LIMIT 1`
  ).get() as { id: string } | undefined;
  return `oi${row ? parseInt(row.id.slice(2)) + 1 : 1}`;
}
