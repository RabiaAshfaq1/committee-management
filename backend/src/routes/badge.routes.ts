import { Router } from 'express';
import { getAllBadges, evaluateUserBadges } from '../controllers/badge.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';

const router = Router();
router.get('/', getAllBadges);
router.post('/evaluate/:userId', authenticate, requireAdmin, evaluateUserBadges);
export default router;
