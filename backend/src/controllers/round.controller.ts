import { Response } from 'express';
import prisma from '../prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  sendSuccess,
  sendError,
  sendNotFound,
  sendBadRequest,
  sendForbidden,
  sendUnauthorized,
} from '../utils/response.utils';
import { evaluateBadges } from '../utils/badge.engine';

export const getRoundsByCommittee = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendUnauthorized(res, 'Unauthorized');
      return;
    }
    const { committeeId } = req.params;

    const committee = await prisma.committee.findUnique({
      where: { id: committeeId },
      include: { members: { select: { userId: true } } },
    });
    if (!committee) {
      sendNotFound(res, 'Committee not found');
      return;
    }

    if (req.user.role === 'MEMBER') {
      const isIn = committee.members.some((m) => m.userId === req.user!.id);
      if (!isIn) {
        sendForbidden(res, 'Access denied');
        return;
      }
    } else if (req.user.role === 'ADMIN' && committee.adminId !== req.user.id) {
      sendForbidden(res, 'Access denied');
      return;
    }

    const rounds = await prisma.round.findMany({
      where: { committeeId },
      include: {
        payments: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        committee: {
          select: {
            adminId: true,
            totalSlots: true,
            monthlyAmount: true,
            turnMethod: true,
            members: {
              include: { user: { select: { id: true, name: true, email: true } } },
            },
          },
        },
      },
      orderBy: { roundNumber: 'asc' },
    });
    sendSuccess(res, rounds, 'Rounds fetched');
  } catch (err) {
    sendError(res, 'Failed to fetch rounds', 500, String(err));
  }
};

export const submitRecipientTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendUnauthorized(res, 'Unauthorized');
      return;
    }
    const { roundId } = req.params;
    const { transactionId } = req.body as { transactionId?: string };
    if (!transactionId?.trim()) {
      sendBadRequest(res, 'transactionId is required');
      return;
    }

    const round = await prisma.round.findUnique({
      where: { id: roundId },
      include: { committee: { select: { adminId: true } } },
    });
    if (!round) {
      sendNotFound(res, 'Round not found');
      return;
    }
    if (round.status !== 'ACTIVE') {
      sendBadRequest(res, 'Only active round');
      return;
    }

    const isRecipient = round.payoutUserId === req.user.id;
    const isAdmin = round.committee.adminId === req.user.id;
    if (!isRecipient && !isAdmin) {
      sendForbidden(res, 'Only recipient or admin');
      return;
    }

    const updated = await prisma.round.update({
      where: { id: roundId },
      data: { recipientTransactionId: transactionId.trim() },
    });
    if (round.payoutUserId) await evaluateBadges(round.payoutUserId);
    sendSuccess(res, updated, 'Recipient transaction saved');
  } catch (err) {
    sendError(res, 'Failed to save', 500, String(err));
  }
};

export const completeRound = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendUnauthorized(res, 'Unauthorized');
      return;
    }
    const { id } = req.params;
    const round = await prisma.round.findUnique({
      where: { id },
      include: { committee: { select: { adminId: true } }, payments: true },
    });
    if (!round) {
      sendNotFound(res, 'Round not found');
      return;
    }
    if (round.committee.adminId !== req.user.id) {
      sendForbidden(res, 'Access denied');
      return;
    }
    const pending = round.payments.filter((p) => p.status !== 'PAID');
    if (pending.length) {
      sendBadRequest(res, 'All member payments must be confirmed before completing');
      return;
    }

    const updated = await prisma.round.update({
      where: { id },
      data: { status: 'COMPLETED' },
    });

    if (round.payoutUserId) await evaluateBadges(round.payoutUserId);
    for (const p of round.payments) await evaluateBadges(p.userId);

    sendSuccess(res, updated, 'Round completed');
  } catch (err) {
    sendError(res, 'Failed to complete round', 500, String(err));
  }
};
