import { Router } from 'express';
import {
  getAllMembers,
  getMemberById,
  getMemberProfile,
  getMemberHistory,
  getMemberBadges,
  getMemberTrustScore,
  createMember,
  updateMember,
  deactivateMember,
} from '../controllers/member.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';

const router = Router();
router.use(authenticate);
router.get('/', requireAdmin, getAllMembers);
router.get('/:id/profile', getMemberProfile);
router.get('/:id/history', getMemberHistory);
router.get('/:id/badges', getMemberBadges);
router.get('/:id/trust-score', getMemberTrustScore);
router.get('/:id', getMemberById);
router.post('/', requireAdmin, createMember);
router.put('/:id', updateMember);
router.patch('/:id/deactivate', requireAdmin, deactivateMember);
export default router;
