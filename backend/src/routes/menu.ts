import { Router, Response, NextFunction } from 'express';
import { getMenuItems, getMenuItemById, createMenuItem, updateMenuItem } from '../db/store';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

function managerOnly(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'manager') {
    res.status(403).json({ error: 'Solo gerentes pueden modificar el menú' });
    return;
  }
  next();
}

// GET /api/menu
router.get('/', (_req: AuthRequest, res: Response): void => {
  res.json(getMenuItems());
});

// POST /api/menu — crear plato
router.post('/', managerOnly, (req: AuthRequest, res: Response): void => {
  const { name, description, price, category, available } = req.body;
  if (!name || price == null || !category) {
    res.status(400).json({ error: 'Faltan campos: name, price, category' });
    return;
  }
  const item = createMenuItem({
    name,
    description: description ?? '',
    price: parseFloat(price),
    category,
    available: available !== false,
  });
  res.status(201).json(item);
});

// PATCH /api/menu/:id — editar plato
router.patch('/:id', managerOnly, (req: AuthRequest, res: Response): void => {
  const existing = getMenuItemById(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Plato no encontrado' });
    return;
  }
  const updated = updateMenuItem(req.params.id, req.body);
  res.json(updated);
});

export default router;
