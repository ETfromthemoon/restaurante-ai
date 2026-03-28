import { Router, Response } from 'express';
import { authMiddleware, AuthRequest, requirePermission } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// GET /api/dashboard
router.get('/', requirePermission('dashboard', 'read'), (req: AuthRequest, res: Response): void => {
  const db = req.store.getRawDb();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayISO = todayStart.toISOString();

  const salesRow = db.prepare(`
    SELECT COALESCE(SUM(oi.quantity * COALESCE(oi.effective_price, m.price)), 0) AS total,
           COUNT(DISTINCT o.id) AS order_count
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    JOIN menu_items  m  ON m.id = oi.menu_item_id
    WHERE o.status = 'billed' AND o.created_at >= ?
  `).get(todayISO) as { total: number; order_count: number };

  const occupiedRow = db.prepare(
    `SELECT COUNT(*) AS count FROM tables WHERE status != 'free'`
  ).get() as { count: number };

  const topItems = db.prepare(`
    SELECT m.name, SUM(oi.quantity) AS total_qty
    FROM order_items oi
    JOIN menu_items m ON m.id = oi.menu_item_id
    JOIN orders     o ON o.id = oi.order_id
    WHERE o.created_at >= ?
    GROUP BY m.id, m.name
    ORDER BY total_qty DESC
    LIMIT 5
  `).all(todayISO) as { name: string; total_qty: number }[];

  const avgRow = db.prepare(`
    SELECT AVG(
      (JULIANDAY(delivered_at) - JULIANDAY(created_at)) * 1440
    ) AS avg_minutes
    FROM orders
    WHERE status = 'billed'
      AND delivered_at IS NOT NULL
      AND created_at >= ?
  `).get(todayISO) as { avg_minutes: number | null };

  res.json({
    sales_today:         salesRow.total,
    orders_today:        salesRow.order_count,
    tables_occupied:     occupiedRow.count,
    top_items:           topItems,
    avg_service_minutes: avgRow.avg_minutes != null ? Math.round(avgRow.avg_minutes) : null,
  });
});

export default router;
