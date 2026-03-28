import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { authMiddleware, AuthRequest, requirePermission } from '../middleware/auth';
import { validate, validateParams, createUserSchema, updateUserSchema, idParamSchema } from '../schemas';

const router = Router();
router.use(authMiddleware);

// GET /api/users — listar todos los usuarios (sin password)
router.get('/', requirePermission('users', 'list'), (req: AuthRequest, res: Response): void => {
  res.json(req.store.getAllUsers());
});

// GET /api/users/:id — obtener un usuario
router.get('/:id', requirePermission('users', 'read'), validateParams(idParamSchema), (req: AuthRequest, res: Response): void => {
  const user = req.store.getUserById(req.params.id);
  if (!user) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }
  const { password: _, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
});

// POST /api/users — crear usuario
router.post('/', requirePermission('users', 'create'), (req: AuthRequest, res: Response): void => {
  const v = validate(createUserSchema, req.body);
  if (!v.success) { res.status(400).json({ error: v.error }); return; }

  // Verificar unicidad de email
  const existing = req.store.getUserByEmail(v.data.email);
  if (existing) { res.status(409).json({ error: 'Ya existe un usuario con ese email' }); return; }

  const hashedPassword = bcrypt.hashSync(v.data.password, 10);
  const newUser = req.store.createUser({
    name:     v.data.name,
    email:    v.data.email,
    password: hashedPassword,
    role:     v.data.role,
  });
  res.status(201).json(newUser);
});

// PATCH /api/users/:id — editar usuario
router.patch('/:id', requirePermission('users', 'update'), validateParams(idParamSchema), (req: AuthRequest, res: Response): void => {
  const user = req.store.getUserById(req.params.id);
  if (!user) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }

  const v = validate(updateUserSchema, req.body);
  if (!v.success) { res.status(400).json({ error: v.error }); return; }

  // Verificar unicidad de email si se está cambiando
  if (v.data.email && v.data.email !== user.email) {
    const existing = req.store.getUserByEmail(v.data.email);
    if (existing) { res.status(409).json({ error: 'Ya existe un usuario con ese email' }); return; }
  }

  // No permitir quitar el último manager
  if (v.data.role && v.data.role !== 'manager' && user.role === 'manager') {
    const managers = req.store.countManagers();
    if (managers <= 1) {
      res.status(400).json({ error: 'No puedes cambiar el rol del único gerente restante' });
      return;
    }
  }

  const fields: any = { ...v.data };
  if (v.data.password) {
    fields.password = bcrypt.hashSync(v.data.password, 10);
  }
  const updated = req.store.updateUser(req.params.id, fields);
  res.json(updated);
});

// DELETE /api/users/:id — eliminar usuario
router.delete('/:id', requirePermission('users', 'delete'), validateParams(idParamSchema), (req: AuthRequest, res: Response): void => {
  const user = req.store.getUserById(req.params.id);
  if (!user) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }

  // No puede eliminar su propia cuenta
  if (req.user!.id === req.params.id) {
    res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
    return;
  }

  // No puede quedar 0 managers
  if (user.role === 'manager') {
    const managers = req.store.countManagers();
    if (managers <= 1) {
      res.status(400).json({ error: 'No puedes eliminar al único gerente restante' });
      return;
    }
  }

  req.store.deleteUser(req.params.id);
  res.status(204).send();
});

export default router;
