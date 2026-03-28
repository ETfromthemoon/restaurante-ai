import { Router, Response } from 'express';
import { authMiddleware, AuthRequest, requirePermission } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.get('/stats', requirePermission('kitchen', 'stats'), (req: AuthRequest, res: Response): void => {
  const db = req.store.getRawDb();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayISO = todayStart.toISOString();

  const queueRow = db.prepare(
    `SELECT COUNT(*) as count FROM orders WHERE status = 'kitchen'`
  ).get() as { count: number };

  const urgentRow = db.prepare(`
    SELECT COUNT(*) as count FROM orders
    WHERE status = 'kitchen'
      AND (JULIANDAY('now', 'localtime') - JULIANDAY(created_at)) * 1440 > 20
  `).get() as { count: number };

  const completedRow = db.prepare(`
    SELECT COUNT(*) as count FROM orders
    WHERE status IN ('ready', 'served', 'billing', 'billed') AND created_at >= ?
  `).get(todayISO) as { count: number };

  const avgRow = db.prepare(`
    SELECT AVG((JULIANDAY(delivered_at) - JULIANDAY(created_at)) * 1440) AS avg_minutes
    FROM orders WHERE delivered_at IS NOT NULL AND created_at >= ?
  `).get(todayISO) as { avg_minutes: number | null };

  const rawDist = db.prepare(`
    SELECT ROUND((JULIANDAY(delivered_at) - JULIANDAY(created_at)) * 1440) AS mins, COUNT(*) AS count
    FROM orders WHERE delivered_at IS NOT NULL AND created_at >= ?
    GROUP BY ROUND((JULIANDAY(delivered_at) - JULIANDAY(created_at)) * 1440) ORDER BY mins
  `).all(todayISO) as { mins: number; count: number }[];

  const buckets: Record<string, number> = { '0-10': 0, '10-20': 0, '20-30': 0, '30+': 0 };
  for (const row of rawDist) {
    if (row.mins <= 10)      buckets['0-10']  += row.count;
    else if (row.mins <= 20) buckets['10-20'] += row.count;
    else if (row.mins <= 30) buckets['20-30'] += row.count;
    else                     buckets['30+']   += row.count;
  }
  const time_distribution = Object.entries(buckets).map(([label, count]) => ({ label, count }));

  const itemsStatus = db.prepare(`
    SELECT oi.status, COUNT(*) as count FROM order_items oi
    JOIN orders o ON o.id = oi.order_id WHERE o.status = 'kitchen' GROUP BY oi.status
  `).all() as { status: string; count: number }[];

  const itemsByStatus = { pending: 0, preparing: 0, done: 0 };
  for (const row of itemsStatus) {
    if (row.status in itemsByStatus) itemsByStatus[row.status as keyof typeof itemsByStatus] = row.count;
  }

  const throughput = db.prepare(`
    SELECT CAST(strftime('%H', created_at) AS INTEGER) AS hour, COUNT(*) AS count
    FROM orders WHERE created_at >= ? GROUP BY hour ORDER BY hour
  `).all(todayISO) as { hour: number; count: number }[];

  const slowestRow = db.prepare(`
    SELECT o.id, t.number AS table_number,
           ROUND((JULIANDAY(o.delivered_at) - JULIANDAY(o.created_at)) * 1440) AS minutes
    FROM orders o JOIN tables t ON t.id = o.table_id
    WHERE o.delivered_at IS NOT NULL AND o.created_at >= ? ORDER BY minutes DESC LIMIT 1
  `).get(todayISO) as { id: string; table_number: number; minutes: number } | undefined;

  const fastestRow = db.prepare(`
    SELECT o.id, t.number AS table_number,
           ROUND((JULIANDAY(o.delivered_at) - JULIANDAY(o.created_at)) * 1440) AS minutes
    FROM orders o JOIN tables t ON t.id = o.table_id
    WHERE o.delivered_at IS NOT NULL AND o.created_at >= ? ORDER BY minutes ASC LIMIT 1
  `).get(todayISO) as { id: string; table_number: number; minutes: number } | undefined;

  res.json({
    orders_in_queue:    queueRow.count,
    urgent_count:       urgentRow.count,
    completed_today:    completedRow.count,
    avg_prep_minutes:   avgRow.avg_minutes != null ? Math.round(avgRow.avg_minutes) : null,
    time_distribution,
    items_by_status:    itemsByStatus,
    throughput_by_hour: throughput,
    slowest_order:      slowestRow ?? null,
    fastest_order:      fastestRow ?? null,
  });
});

export default router;
