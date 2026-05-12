import { Router } from 'express';
import {
  createCommittee,
  getAllCommittees,
  getCommitteeById,
  updateCommittee,
  deleteCommittee,
  addMember,
  removeMember,
  assignTurns,
  startRound,
} from '../controllers/committee.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);
router.get('/', getAllCommittees);
router.get('/:id', getCommitteeById);
router.post('/', createCommittee);
router.put('/:id', updateCommittee);
router.delete('/:id', deleteCommittee);
router.post('/:id/members', addMember);
router.delete('/:id/members/:memberId', removeMember);
router.post('/:id/assign-turns', assignTurns);
router.post('/:id/start-round', startRound);
export default router;
