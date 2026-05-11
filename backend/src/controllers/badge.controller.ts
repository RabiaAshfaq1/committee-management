import { Response } from 'express';
import prisma from '../prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess, sendError, sendForbidden } from '../utils/response.utils';
import { evaluateBadges } from '../utils/badge.engine';

export const getAllBadges = async (_req: unknown, res: Response): Promise<void> => {
  try {
    const badges = await prisma.badge.findMany({ orderBy: { name: 'asc' } });
    sendSuccess(res, badges, 'Badges fetched');
  } catch (err) {
    sendError(res, 'Failed to fetch badges', 500, String(err));
  }
};

export const evaluateUserBadges = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    if (req.user!.role !== 'ADMIN') {
      sendForbidden(res, 'Admin only');
      return;
    }
    await evaluateBadges(userId);
    const badges = await prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true },
    });
    sendSuccess(res, badges, 'Badges evaluated');
  } catch (err) {
    sendError(res, 'Failed to evaluate badges', 500, String(err));
  }
};
