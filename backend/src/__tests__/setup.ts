import { getTestDb } from '../db/tenantPool';
import { beforeEach } from 'vitest';

/**
 * Limpia solo las tablas mutables entre tests.
 * users, tables y menu_items son datos de seed — no se borran.
 */
export function resetDatabase() {
  const db = getTestDb();
  db.exec('DELETE FROM order_items');
  db.exec('DELETE FROM orders');
  db.exec('DELETE FROM caja_sessions');
}

beforeEach(() => {
  resetDatabase();
});
