import { Router, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { AuthRequest, JWT_SECRET } from '../middleware/auth';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Password requerido'),
});

const router = Router();

router.post('/login', (req: AuthRequest, res: Response): void => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    const issues = (parsed.error as any).issues ?? [];
    res.status(400).json({ error: issues[0]?.message ?? 'Datos inválidos' });
    return;
  }

  const { email, password } = parsed.data;
  const user = req.store.getUserByEmail(email);

  if (!user || !bcrypt.compareSync(password, user.password)) {
    res.status(401).json({ error: 'Credenciales incorrectas' });
    return;
  }

  const token = jwt.sign(
    { id: user.id, role: user.role, name: user.name, tenant: req.tenantSlug },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  const { password: _, ...userWithoutPassword } = user;
  res.json({ token, user: userWithoutPassword });
});

export default router;
