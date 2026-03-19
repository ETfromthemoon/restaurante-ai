import { Router, Response } from 'express';
import { getTables, getTableById, updateTable, getWaiters } from '../db/store';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { getIO } from '../socket';
import { validate, updateTableStatusSchema, assignWaiterSchema } from '../schemas';

const router = Router();
router.use(authMiddleware);

router.get('/', (_req: AuthRequest, res: Response): void => {
  res.json(getTables());
});

// GET /api/tables/waiters
router.get('/waiters', (_req: AuthRequest, res: Response): void => {
  res.json(getWaiters());
});

// PATCH /api/tables/:id/assign — asignar o desasignar mesero (solo manager)
router.patch('/:id/assign', requireRole('manager'), (req: AuthRequest, res: Response): void => {
  const table = getTableById(req.params.id);
  if (!table) { res.status(404).json({ error: 'Mesa no encontrada' }); return; }
  const v = validate(assignWaiterSchema, req.body);
  if (!v.success) { res.status(400).json({ error: v.error }); return; }
  updateTable(req.params.id, { assigned_waiter_id: v.data.waiter_id ?? null });
  const updated = getTableById(req.params.id);
  getIO().to('waiters').emit('table:updated', { table: updated });
  res.json(updated);
});

router.patch('/:id', (req: AuthRequest, res: Response): void => {
  const table = getTableById(req.params.id);
  if (!table) { res.status(404).json({ error: 'Mesa no encontrada' }); return; }
  const v = validate(updateTableStatusSchema, req.body);
  if (!v.success) { res.status(400).json({ error: v.error }); return; }
  updateTable(req.params.id, { status: v.data.status });
  res.json(getTableById(req.params.id));
});

export default router;
