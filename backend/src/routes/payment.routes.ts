import { Router } from 'express';
import {
  submitTransaction,
  confirmPayment,
  getPaymentsByRound,
} from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';

const router = Router();
router.use(authenticate);
router.get('/round/:roundId', getPaymentsByRound);
router.post('/:id/submit-transaction', submitTransaction);
router.patch('/:id/confirm', requireAdmin, confirmPayment);
export default router;
