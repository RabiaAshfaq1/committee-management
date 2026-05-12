import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { adminOverview, adminRemoveCommitteeMember } from '../controllers/admin.controller';

const router = Router();
router.use(authenticate);
router.get('/overview', adminOverview);
router.delete('/committees/:committeeId/members/:memberId', adminRemoveCommitteeMember);

export default router;
