import { Router } from 'express';
import {
  getRoundsByCommittee,
  completeRound,
  submitRecipientTransaction,
} from '../controllers/round.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';

const router = Router();
router.use(authenticate);
router.patch('/round/:roundId/recipient-tx', submitRecipientTransaction);
router.get('/:committeeId', getRoundsByCommittee);
router.put('/round/:id/complete', requireAdmin, completeRound);
export default router;
