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
import { isPlatformAdmin } from '../utils/committee.access';

export const createFeedback = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { toUserId, committeeId, roundId, rating, comment } = req.body as {
      toUserId?: string;
      committeeId?: string;
      roundId?: string;
      rating?: unknown;
      comment?: string | null;
    };
    if (!toUserId || !committeeId || !roundId || rating === undefined) {
      sendBadRequest(res, 'toUserId, committeeId, roundId, and rating are required');
      return;
    }
    const r = Number(rating);
    if (r < 1 || r > 5) {
      sendBadRequest(res, 'rating must be 1–5');
      return;
    }

    const committee = await prisma.committee.findUnique({
      where: { id: committeeId },
      select: { id: true },
    });
    if (!committee) {
      sendNotFound(res, 'Committee not found');
      return;
    }

    const round = await prisma.round.findFirst({
      where: { id: roundId, committeeId, status: 'COMPLETED' },
      select: { id: true },
    });
    if (!round) {
      sendBadRequest(res, 'Feedback is only allowed after the selected round is completed in this committee');
      return;
    }

    const actorIsModerator = isPlatformAdmin(req.user!.role);
    const actorMembership = await prisma.committeeMember.findFirst({
      where: { committeeId, userId: req.user!.id },
    });
    if (!actorIsModerator && !actorMembership) {
      sendForbidden(res, 'Join this committee or sign in as a moderator to leave feedback');
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

    const dup = await prisma.feedback.findFirst({
      where: { fromUserId: req.user!.id, toUserId, roundId },
    });
    if (dup) {
      sendBadRequest(res, 'You have already left feedback for this member for this round');
      return;
    }

    const fb = await prisma.feedback.create({
      data: {
        fromUserId: req.user!.id,
        toUserId,
        committeeId,
        roundId,
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
    const list = await prisma.feedback.findMany({
      where: { toUserId: userId },
      include: {
        fromUser: { select: { id: true, name: true, email: true } },
        committee: { select: { id: true, name: true } },
        round: { select: { id: true, roundNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    sendSuccess(res, list, 'Feedback fetched');
  } catch (err) {
    sendError(res, 'Failed to fetch feedback', 500, String(err));
  }
};
