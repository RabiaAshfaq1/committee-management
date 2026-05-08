import { Router } from 'express';
import { getDashboardStats, getRecentActivity } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);
router.get('/stats', getDashboardStats);
router.get('/recent-activity', getRecentActivity);
export default router;
