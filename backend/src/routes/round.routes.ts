import { Router } from 'express';
import {
  getRoundsByCommittee,
  completeRound,
  submitRecipientTransaction,
  postRoundsStart,
  assignTurn,
} from '../controllers/round.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);
router.post('/start', postRoundsStart);
router.post('/:id/assign-turn', assignTurn);
router.patch('/round/:roundId/recipient-tx', submitRecipientTransaction);
router.get('/committee/:committeeId', getRoundsByCommittee);
router.put('/round/:id/complete', completeRound);
export default router;
