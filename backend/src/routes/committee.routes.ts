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
import { requireAdmin } from '../middleware/role.middleware';

const router = Router();
router.use(authenticate);
router.get('/', getAllCommittees);
router.get('/:id', getCommitteeById);
router.post('/', requireAdmin, createCommittee);
router.put('/:id', requireAdmin, updateCommittee);
router.delete('/:id', requireAdmin, deleteCommittee);
router.post('/:id/members', requireAdmin, addMember);
router.delete('/:id/members/:memberId', requireAdmin, removeMember);
router.post('/:id/assign-turns', requireAdmin, assignTurns);
router.post('/:id/start-round', requireAdmin, startRound);
export default router;
