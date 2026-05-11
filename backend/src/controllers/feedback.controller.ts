import { Response } from 'express';
import prisma from '../prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  sendSuccess,
  sendCreated,
  sendError,
  sendBadRequest,
  sendForbidden,
  sendNotFound,
} from '../utils/response.utils';
import { evaluateBadges } from '../utils/badge.engine';

export const createFeedback = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { toUserId, committeeId, rating, comment } = req.body;
    if (!toUserId || !committeeId || rating === undefined) {
      sendBadRequest(res, 'toUserId, committeeId, rating required');
      return;
    }
    const r = Number(rating);
    if (r < 1 || r > 5) {
      sendBadRequest(res, 'rating must be 1–5');
      return;
    }

    if (req.user!.role !== 'ADMIN') {
      sendForbidden(res, 'Only admins can leave member feedback');
      return;
    }

    const committee = await prisma.committee.findUnique({
      where: { id: committeeId },
      select: { adminId: true },
    });
    if (!committee) {
      sendNotFound(res, 'Committee not found');
      return;
    }
    if (committee.adminId !== req.user!.id) {
      sendForbidden(res, 'You can only leave feedback for committees you manage');
      return;
    }

    const recipient = await prisma.committeeMember.findFirst({
      where: { committeeId, userId: toUserId },
    });
    if (!recipient) {
      sendBadRequest(res, 'Recipient must be a member of this committee');
      return;
    }

    if (toUserId === req.user!.id) {
      sendBadRequest(res, 'You cannot leave feedback for yourself');
      return;
    }

    const fb = await prisma.feedback.create({
      data: {
        fromUserId: req.user!.id,
        toUserId,
        committeeId,
        rating: r,
        comment: comment || null,
      },
    });
    await evaluateBadges(toUserId);
    sendCreated(res, fb, 'Feedback saved');
  } catch (err) {
    sendError(res, 'Failed to save feedback', 500, String(err));
  }
};

export const getFeedbackForUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    if (req.user!.role !== 'ADMIN' && req.user!.id !== userId) {
      sendForbidden(res, 'Access denied');
      return;
    }
    const list = await prisma.feedback.findMany({
      where: { toUserId: userId },
      include: {
        fromUser: { select: { id: true, name: true, email: true } },
        committee: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    sendSuccess(res, list, 'Feedback fetched');
  } catch (err) {
    sendError(res, 'Failed to fetch feedback', 500, String(err));
  }
};
