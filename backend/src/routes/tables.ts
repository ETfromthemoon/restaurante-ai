import { Router, Response } from 'express';
import { getTables, getTableById, updateTable } from '../db/store';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { TableStatus } from '../types';

const router = Router();
router.use(authMiddleware);

router.get('/', (_req: AuthRequest, res: Response): void => {
  res.json(getTables());
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
