import { Router } from 'express';
import { createFeedback, getFeedbackForUser } from '../controllers/feedback.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);
router.post('/', createFeedback);
router.get('/user/:userId', getFeedbackForUser);
export default router;
