import { Router, Response } from 'express';
import { authMiddleware, AuthRequest, requirePermission } from '../middleware/auth';
import { Promotion } from '../types';
import { validate, createPromotionSchema, updatePromotionSchema } from '../schemas';

const router = Router();
router.use(authMiddleware);

// GET /api/promotions
router.get('/', requirePermission('promotions', 'list'), (_req: AuthRequest, res: Response): void => {
  res.json(_req.store.getPromotions());
});

// GET /api/promotions/active
router.get('/active', requirePermission('promotions', 'listActive'), (_req: AuthRequest, res: Response): void => {
  const now = new Date();
  const day = now.getDay() || 7;
  const hhmm = now.toTimeString().slice(0, 5);
  const active = _req.store.getActivePromotions().filter(p =>
    p.days_of_week.includes(day) && hhmm >= p.time_start && hhmm < p.time_end
  );
  res.json(active);
});

// POST /api/promotions
router.post('/', requirePermission('promotions', 'create'), (req: AuthRequest, res: Response): void => {
  const v = validate(createPromotionSchema, req.body);
  if (!v.success) { res.status(400).json({ error: v.error }); return; }
  const promo = req.store.insertPromotion({
    ...v.data, target_id: v.data.target_id ?? null,
    active: true, created_at: new Date().toISOString(),
  } as Omit<Promotion, 'id'>);
  res.status(201).json(promo);
});

// PATCH /api/promotions/:id
router.patch('/:id', requirePermission('promotions', 'update'), (req: AuthRequest, res: Response): void => {
  const v = validate(updatePromotionSchema, req.body);
  if (!v.success) { res.status(400).json({ error: v.error }); return; }
  res.json(req.store.updatePromotion(req.params.id, v.data));
});

export default router;
