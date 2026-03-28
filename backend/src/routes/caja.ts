import { Router, Response } from 'express';
import { authMiddleware, AuthRequest, requirePermission } from '../middleware/auth';
import { validateParams, idParamSchema } from '../schemas';
import { Order } from '../types';

const router = Router();
router.use(authMiddleware);

// GET /api/caja/active
router.get('/active', requirePermission('caja', 'readActive'), (_req: AuthRequest, res: Response): void => {
  res.json(_req.store.getActiveCajaSession() ?? null);
});

// GET /api/caja — historial
router.get('/', requirePermission('caja', 'readHistory'), (_req: AuthRequest, res: Response): void => {
  res.json(_req.store.getCajaSessions());
});

// POST /api/caja/open — abrir turno
router.post('/open', requirePermission('caja', 'open'), (req: AuthRequest, res: Response): void => {
  const existing = req.store.getActiveCajaSession();
  if (existing) {
    res.status(409).json({ error: 'Ya hay una sesión de caja activa', session: existing });
    return;
  }
  const session = {
    id: `caja${Date.now()}`,
    cashier_id: req.user!.id,
    cashier_name: req.user!.name,
    opened_at: new Date().toISOString(),
  };
  req.store.insertCajaSession(session);
  res.status(201).json(session);
});

// PATCH /api/caja/:id/close — cerrar turno
router.patch('/:id/close', requirePermission('caja', 'close'), validateParams(idParamSchema), (req: AuthRequest, res: Response): void => {
  const session = req.store.getCajaSessionById(req.params.id);
  if (!session) { res.status(404).json({ error: 'Sesión de caja no encontrada' }); return; }
  if (session.closed_at) { res.status(409).json({ error: 'La sesión ya está cerrada' }); return; }

  // Bloquear cierre si hay pedidos pendientes de cobro
  const db = req.store.getRawDb();
  const pendingBilling = db.prepare(
    "SELECT COUNT(*) as count FROM orders WHERE status = 'billing'"
  ).get() as { count: number };
  if (pendingBilling.count > 0) {
    res.status(409).json({
      error: `Hay ${pendingBilling.count} pedido(s) pendientes de cobro. Cóbralos antes de cerrar la caja.`,
      pending_count: pendingBilling.count,
    });
    return;
  }

  const closedAt = new Date().toISOString();
  req.store.closeCajaSession(req.params.id, closedAt);
  res.json({ ...session, closed_at: closedAt });
});

// GET /api/caja/:id/summary — resumen de una sesión
router.get('/:id/summary', requirePermission('caja', 'summary'), validateParams(idParamSchema), (req: AuthRequest, res: Response): void => {
  const session = req.store.getCajaSessionById(req.params.id);
  if (!session) { res.status(404).json({ error: 'Sesión de caja no encontrada' }); return; }

  const db = req.store.getRawDb();
  const orders = db.prepare(
    "SELECT * FROM orders WHERE caja_session_id = ? AND status = 'billed'"
  ).all(req.params.id) as Order[];

  let total = 0;
  const enrichedOrders = orders.map(order => {
    const items = req.store.getItemsByOrderId(order.id).map(item => {
      const menuItem = req.store.getMenuItemById(item.menu_item_id);
      const unitPrice = item.effective_price != null ? item.effective_price : (menuItem?.price ?? 0);
      total += unitPrice * item.quantity;
      return { ...item, menu_item: menuItem };
    });
    return { ...order, items };
  });

  res.json({ session, orders: enrichedOrders, total: Math.round(total * 100) / 100 });
});

export default router;
