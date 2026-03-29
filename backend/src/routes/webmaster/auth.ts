/**
 * POST /webmaster/api/login
 * Autenticación exclusiva del panel webmaster.
 * Usa webmaster_users de la master DB + JWT separado.
 */
import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { masterStore } from '../../db/masterDatabase';
import { WEBMASTER_JWT_SECRET } from '../../middleware/webmasterAuth';

const router = Router();

const loginSchema = z.object({
  email:    z.string().email('Email inválido'),
  password: z.string().min(1, 'Password requerido'),
});

router.post('/login', (req: Request, res: Response): void => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    const issues = (parsed.error as any).issues ?? [];
    res.status(400).json({ error: issues[0]?.message ?? 'Datos inválidos' });
    return;
  }

  const { email, password } = parsed.data;
  const user = masterStore.getWebmasterByEmail(email);

  if (!user || !bcrypt.compareSync(password, user.password)) {
    res.status(401).json({ error: 'Credenciales incorrectas' });
    return;
  }

  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email },
    WEBMASTER_JWT_SECRET,
    { expiresIn: '12h' }
  );

  res.json({ token, webmaster: { id: user.id, name: user.name, email: user.email } });
});

export default router;
