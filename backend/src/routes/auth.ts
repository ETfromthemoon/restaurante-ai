import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getUserByEmail } from '../db/store';
import { JWT_SECRET } from '../middleware/auth';

const router = Router();

router.post('/login', (req: Request, res: Response): void => {
  const { email, password } = req.body;
  const user = getUserByEmail(email);

  if (!user || user.password !== password) {
    res.status(401).json({ error: 'Credenciales incorrectas' });
    return;
  }

  const token = jwt.sign(
    { id: user.id, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  const { password: _, ...userWithoutPassword } = user;
  res.json({ token, user: userWithoutPassword });
});

export default router;
