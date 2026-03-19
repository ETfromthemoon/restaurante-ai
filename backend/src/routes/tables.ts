import { Router, Response } from 'express';
import { getTables, getTableById, updateTable, getWaiters } from '../db/store';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { TableStatus } from '../types';
import { getIO } from '../socket';

const router = Router();
router.use(authMiddleware);

router.get('/', (_req: AuthRequest, res: Response): void => {
  res.json(getTables());
});

// GET /api/tables/waiters — lista de meseros (antes de /:id para no interpretar como ID)
router.get('/waiters', (_req: AuthRequest, res: Response): void => {
  res.json(getWaiters());
});

// PATCH /api/tables/:id/assign — asignar o desasignar mesero
router.patch('/:id/assign', (req: AuthRequest, res: Response): void => {
  const table = getTableById(req.params.id);
  if (!table) {
    res.status(404).json({ error: 'Mesa no encontrada' });
    return;
  }
  const { waiter_id } = req.body as { waiter_id: string | null };
  updateTable(req.params.id, { assigned_waiter_id: waiter_id ?? null });
  const updated = getTableById(req.params.id);
  getIO().to('waiters').emit('table:updated', { table: updated });
  res.json(updated);
});

router.patch('/:id', (req: AuthRequest, res: Response): void => {
  const table = getTableById(req.params.id);
  if (!table) {
    res.status(404).json({ error: 'Mesa no encontrada' });
    return;
  }
  const { status } = req.body as { status: TableStatus };
  if (status) updateTable(req.params.id, { status });
  res.json(getTableById(req.params.id));
});

export default router;
