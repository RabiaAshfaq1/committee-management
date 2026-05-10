import { Router } from 'express';
import {
  getAllMembers,
  getMemberById,
  getMemberCommitteeHistory,
  createMember,
  updateMember,
  deactivateMember,
} from '../controllers/member.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireOrganizer } from '../middleware/role.middleware';

const router = Router();
router.use(authenticate);
router.get('/', requireOrganizer, getAllMembers);
router.get('/:id/history', getMemberCommitteeHistory);
router.get('/:id', getMemberById);
router.post('/', requireOrganizer, createMember);
router.put('/:id', requireOrganizer, updateMember);
router.patch('/:id/deactivate', requireOrganizer, deactivateMember);
export default router;
