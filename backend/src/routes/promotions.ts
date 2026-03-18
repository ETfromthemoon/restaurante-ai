import { Router, Response } from 'express';
import { getPromotions, getActivePromotions, insertPromotion, updatePromotion } from '../db/store';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { Promotion } from '../types';

const router = Router();
router.use(authMiddleware);

// GET /api/promotions — todas (manager)
router.get('/', (req: AuthRequest, res: Response): void => {
  if (req.user?.role !== 'manager') {
    res.status(403).json({ error: 'Solo para gerentes' });
    return;
  }
  res.json(getPromotions());
});

// GET /api/promotions/active — activas ahora (waiter)
router.get('/active', (req: AuthRequest, res: Response): void => {
  const now = new Date();
  const day = now.getDay() || 7;
  const hhmm = now.toTimeString().slice(0, 5);
  const active = getActivePromotions().filter(p =>
    p.days_of_week.includes(day) && hhmm >= p.time_start && hhmm < p.time_end
  );
  res.json(active);
});

// POST /api/promotions — crear (manager)
router.post('/', (req: AuthRequest, res: Response): void => {
  if (req.user?.role !== 'manager') {
    res.status(403).json({ error: 'Solo para gerentes' });
    return;
  }
  const { name, type, value, applies_to, target_id, days_of_week, time_start, time_end } = req.body;
  if (!name || !type || !applies_to || !days_of_week || !time_start || !time_end) {
    res.status(400).json({ error: 'Campos requeridos: name, type, applies_to, days_of_week, time_start, time_end' });
    return;
  }
  const promo = insertPromotion({
    name, type, value: value ?? 0, applies_to, target_id: target_id ?? null,
    days_of_week, time_start, time_end, active: true, created_at: new Date().toISOString(),
  } as Omit<Promotion, 'id'>);
  res.status(201).json(promo);
});

// PATCH /api/promotions/:id — editar / toggle (manager)
router.patch('/:id', (req: AuthRequest, res: Response): void => {
  if (req.user?.role !== 'manager') {
    res.status(403).json({ error: 'Solo para gerentes' });
    return;
  }
  const updated = updatePromotion(req.params.id, req.body);
  res.json(updated);
});

export default router;
