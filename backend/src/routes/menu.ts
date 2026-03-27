import { Router, Response } from 'express';
import { getMenuItems, getMenuItemById, createMenuItem, updateMenuItem } from '../db/store';
import { authMiddleware, AuthRequest, requirePermission } from '../middleware/auth';
import { validate, createMenuItemSchema, updateMenuItemSchema } from '../schemas';

const router = Router();
router.use(authMiddleware);

// GET /api/menu
router.get('/', (_req: AuthRequest, res: Response): void => {
  res.json(getMenuItems());
});

// POST /api/menu — crear plato
router.post('/', requirePermission('menu', 'create'), (req: AuthRequest, res: Response): void => {
  const v = validate(createMenuItemSchema, req.body);
  if (!v.success) { res.status(400).json({ error: v.error }); return; }
  const item = createMenuItem(v.data);
  res.status(201).json(item);
});

// PATCH /api/menu/:id — editar plato
router.patch('/:id', requirePermission('menu', 'update'), (req: AuthRequest, res: Response): void => {
  const existing = getMenuItemById(req.params.id);
  if (!existing) { res.status(404).json({ error: 'Plato no encontrado' }); return; }
  const v = validate(updateMenuItemSchema, req.body);
  if (!v.success) { res.status(400).json({ error: v.error }); return; }
  const fields = { ...v.data };
  if (fields.stock !== undefined && fields.stock !== null && fields.available === undefined) {
    fields.available = fields.stock > 0;
  }
  const updated = updateMenuItem(req.params.id, fields);
  res.json(updated);
});

export default router;
