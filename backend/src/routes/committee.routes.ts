import { Router } from 'express';
import {
  createCommittee, getAllCommittees, getCommitteeById,
  updateCommittee, deleteCommittee, addMember, removeMember, assignTurns,
} from '../controllers/committee.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireOrganizer } from '../middleware/role.middleware';

const router = Router();
router.use(authenticate);
router.get('/', getAllCommittees);
router.get('/:id', getCommitteeById);
router.post('/', requireOrganizer, createCommittee);
router.put('/:id', requireOrganizer, updateCommittee);
router.delete('/:id', requireOrganizer, deleteCommittee);
router.post('/:id/members', requireOrganizer, addMember);
router.delete('/:id/members/:memberId', requireOrganizer, removeMember);
router.post('/:id/assign-turns', requireOrganizer, assignTurns);
export default router;
