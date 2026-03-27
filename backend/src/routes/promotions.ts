import { Router, Response } from 'express';
import { getPromotions, getActivePromotions, insertPromotion, updatePromotion } from '../db/store';
import { authMiddleware, AuthRequest, requirePermission } from '../middleware/auth';
import { Promotion } from '../types';
import { validate, createPromotionSchema, updatePromotionSchema } from '../schemas';

const router = Router();
router.use(authMiddleware);

// GET /api/promotions — todas (manager)
router.get('/', requirePermission('promotions', 'list'), (_req: AuthRequest, res: Response): void => {
  res.json(getPromotions());
});

// GET /api/promotions/active — activas ahora (waiter)
router.get('/active', requirePermission('promotions', 'listActive'), (_req: AuthRequest, res: Response): void => {
  const now = new Date();
  const day = now.getDay() || 7;
  const hhmm = now.toTimeString().slice(0, 5);
  const active = getActivePromotions().filter(p =>
    p.days_of_week.includes(day) && hhmm >= p.time_start && hhmm < p.time_end
  );
  res.json(active);
});

// POST /api/promotions — crear (manager)
router.post('/', requirePermission('promotions', 'create'), (req: AuthRequest, res: Response): void => {
  const v = validate(createPromotionSchema, req.body);
  if (!v.success) { res.status(400).json({ error: v.error }); return; }
  const promo = insertPromotion({
    ...v.data, target_id: v.data.target_id ?? null,
    active: true, created_at: new Date().toISOString(),
  } as Omit<Promotion, 'id'>);
  res.status(201).json(promo);
});

// PATCH /api/promotions/:id — editar / toggle (manager)
router.patch('/:id', requirePermission('promotions', 'update'), (req: AuthRequest, res: Response): void => {
  const v = validate(updatePromotionSchema, req.body);
  if (!v.success) { res.status(400).json({ error: v.error }); return; }
  const updated = updatePromotion(req.params.id, v.data);
  res.json(updated);
});

export default router;
