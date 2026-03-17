import { db } from './database';
import { User, Table, MenuItem, Order, OrderItem, OrderItemStatus } from '../types';

// ── helpers ───────────────────────────────────────────────
function mapMenuItem(row: any): MenuItem {
  return { ...row, available: row.available === 1 };
}

// ── USERS ─────────────────────────────────────────────────
export function getUserByEmail(email: string): User | undefined {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;
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
  fields: Partial<Pick<Table, 'status' | 'last_interaction_at'>>
): void {
  const sets: string[] = [];
  const values: any[]  = [];

  if (fields.status !== undefined) {
    sets.push('status = ?');
    values.push(fields.status);
  }
  if ('last_interaction_at' in fields) {
    // undefined → NULL en SQLite (libera la mesa)
    sets.push('last_interaction_at = ?');
    values.push(fields.last_interaction_at ?? null);
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
  fields: Partial<Pick<Order, 'status' | 'delivered_at'>>
): void {
  const sets: string[] = [];
  const values: any[]  = [];

  if (fields.status       !== undefined) { sets.push('status = ?');       values.push(fields.status); }
  if (fields.delivered_at !== undefined) { sets.push('delivered_at = ?'); values.push(fields.delivered_at); }

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
    `INSERT INTO order_items (id, order_id, menu_item_id, quantity, notes, status)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(item.id, item.order_id, item.menu_item_id, item.quantity, item.notes ?? null, item.status);
}

export function deleteOrderItem(itemId: string): void {
  db.prepare('DELETE FROM order_items WHERE id = ?').run(itemId);
}

export function updateOrderItemStatus(itemId: string, status: OrderItemStatus): void {
  db.prepare('UPDATE order_items SET status = ? WHERE id = ?').run(status, itemId);
}

export function updateOrderItemQuantity(itemId: string, quantity: number): void {
  db.prepare('UPDATE order_items SET quantity = ? WHERE id = ?').run(quantity, itemId);
}

// ── MENU ITEMS CRUD ───────────────────────────────────────
export function createMenuItem(item: Omit<MenuItem, 'id'>): MenuItem {
  const id = `m${Date.now()}`;
  db.prepare(
    `INSERT INTO menu_items (id, name, description, price, category, available, image_url)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, item.name, item.description, item.price, item.category, item.available ? 1 : 0, item.image_url ?? null);
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

  if (sets.length === 0) return getMenuItemById(id);
  values.push(id);
  db.prepare(`UPDATE menu_items SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  return getMenuItemById(id);
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
