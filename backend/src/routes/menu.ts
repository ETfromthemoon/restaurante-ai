import { Router, Response } from 'express';
import { getMenuItems } from '../db/store';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.get('/', (_req: AuthRequest, res: Response): void => {
  res.json(getMenuItems());
});

export default router;
