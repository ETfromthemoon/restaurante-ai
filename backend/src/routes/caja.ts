import { Router, Response } from 'express';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { validateParams, idParamSchema } from '../schemas';
import {
  getActiveCajaSession, getCajaSessions, getCajaSessionById,
  insertCajaSession, closeCajaSession,
  getItemsByOrderId, getMenuItemById,
} from '../db/store';
import { db } from '../db/database';
import { Order } from '../types';

const router = Router();
router.use(authMiddleware);

// GET /api/caja/active
router.get('/active', (_req: AuthRequest, res: Response): void => {
  const session = getActiveCajaSession();
  res.json(session ?? null);
});

// GET /api/caja — historial (manager)
router.get('/', requireRole('manager'), (_req: AuthRequest, res: Response): void => {
  res.json(getCajaSessions());
});

// POST /api/caja/open — abrir turno (manager)
router.post('/open', requireRole('manager'), (req: AuthRequest, res: Response): void => {
  const existing = getActiveCajaSession();
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
  insertCajaSession(session);
  res.status(201).json(session);
});

// PATCH /api/caja/:id/close — cerrar turno (manager)
router.patch('/:id/close', requireRole('manager'), validateParams(idParamSchema), (req: AuthRequest, res: Response): void => {
  const session = getCajaSessionById(req.params.id);
  if (!session) {
    res.status(404).json({ error: 'Sesión de caja no encontrada' });
    return;
  }
  if (session.closed_at) {
    res.status(409).json({ error: 'La sesión ya está cerrada' });
    return;
  }
  const closedAt = new Date().toISOString();
  closeCajaSession(req.params.id, closedAt);
  res.json({ ...session, closed_at: closedAt });
});

// GET /api/caja/:id/summary — resumen de una sesión
router.get('/:id/summary', requireRole('manager'), validateParams(idParamSchema), (req: AuthRequest, res: Response): void => {
  const session = getCajaSessionById(req.params.id);
  if (!session) {
    res.status(404).json({ error: 'Sesión de caja no encontrada' });
    return;
  }
  const orders = db.prepare(
    "SELECT * FROM orders WHERE caja_session_id = ? AND status = 'billed'"
  ).all(req.params.id) as Order[];

  let total = 0;
  const enrichedOrders = orders.map(order => {
    const items = getItemsByOrderId(order.id).map(item => {
      const menuItem = getMenuItemById(item.menu_item_id);
      const unitPrice = item.effective_price != null ? item.effective_price : (menuItem?.price ?? 0);
      total += unitPrice * item.quantity;
      return { ...item, menu_item: menuItem };
    });
    return { ...order, items };
  });

  res.json({ session, orders: enrichedOrders, total: Math.round(total * 100) / 100 });
});

export default router;
