import { Router } from 'express';
import {
  startRound,
  getRoundsByCommittee,
  completeRound,
  submitPayoutTransaction,
} from '../controllers/round.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireOrganizer } from '../middleware/role.middleware';

const router = Router();
router.use(authenticate);
router.post('/start', requireOrganizer, startRound);
router.patch('/round/:roundId/payout-tx', submitPayoutTransaction);
router.get('/:committeeId', getRoundsByCommittee);
router.put('/:id/complete', requireOrganizer, completeRound);
export default router;
