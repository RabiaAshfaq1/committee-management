import { Router } from 'express';
import {
  markPaymentPaid, getPaymentsByRound, getPaymentsByMember,
  getOverduePayments, getAllPayments,
} from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireOrganizer } from '../middleware/role.middleware';

const router = Router();
router.use(authenticate);
router.get('/', requireOrganizer, getAllPayments);
router.get('/overdue', requireOrganizer, getOverduePayments);
router.get('/round/:roundId', getPaymentsByRound);
router.get('/member/:memberId', getPaymentsByMember);
router.patch('/:id/pay', requireOrganizer, markPaymentPaid);
export default router;
