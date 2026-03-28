import { Router, Response } from 'express';
import { authMiddleware, AuthRequest, requireRole, requirePermission } from '../middleware/auth';
import { getTenantIO } from '../socket';
import { validate, updateTableStatusSchema, assignWaiterSchema } from '../schemas';

const router = Router();
router.use(authMiddleware);

router.get('/', (_req: AuthRequest, res: Response): void => {
  res.json(_req.store.getTables());
});

// GET /api/tables/waiters
router.get('/waiters', requirePermission('tables', 'listWaiters'), (_req: AuthRequest, res: Response): void => {
  res.json(_req.store.getWaiters());
});

// PATCH /api/tables/:id/assign
router.patch('/:id/assign', requireRole('manager'), (req: AuthRequest, res: Response): void => {
  const table = req.store.getTableById(req.params.id);
  if (!table) { res.status(404).json({ error: 'Mesa no encontrada' }); return; }
  const v = validate(assignWaiterSchema, req.body);
  if (!v.success) { res.status(400).json({ error: v.error }); return; }

  if (v.data.waiter_id != null) {
    const waiters = req.store.getWaiters();
    const exists = waiters.some(w => w.id === v.data.waiter_id);
    if (!exists) { res.status(400).json({ error: 'El mesero especificado no existe.' }); return; }
  }

  req.store.updateTable(req.params.id, { assigned_waiter_id: v.data.waiter_id ?? null });
  const updated = req.store.getTableById(req.params.id);
  getTenantIO(req.tenantSlug).to('waiters').emit('table:updated', { table: updated });
  res.json(updated);
});

// PATCH /api/tables/:id
router.patch('/:id', requirePermission('tables', 'update'), (req: AuthRequest, res: Response): void => {
  const table = req.store.getTableById(req.params.id);
  if (!table) { res.status(404).json({ error: 'Mesa no encontrada' }); return; }
  const v = validate(updateTableStatusSchema, req.body);
  if (!v.success) { res.status(400).json({ error: v.error }); return; }
  req.store.updateTable(req.params.id, { status: v.data.status });
  res.json(req.store.getTableById(req.params.id));
});

export default router;
