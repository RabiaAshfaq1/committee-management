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
import { canManageCommittee, isPlatformAdmin } from '../utils/committee.access';
import { startRound } from './committee.controller';

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

    const canView =
      isPlatformAdmin(req.user.role) ||
      committee.adminId === req.user.id ||
      committee.members.some((m) => m.userId === req.user!.id);
    if (!canView) {
      sendForbidden(res, 'Join this committee or sign in as a moderator to view rounds');
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
    const canManage = canManageCommittee(req.user.id, req.user.role, round.committee.adminId);
    if (!isRecipient && !canManage) {
      sendForbidden(res, 'Only recipient, organizer, or platform moderator');
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
    if (!canManageCommittee(req.user.id, req.user.role, round.committee.adminId)) {
      sendForbidden(res, 'Only the organizer or a platform moderator can complete a round');
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

export const postRoundsStart = async (req: AuthRequest, res: Response): Promise<void> => {
  const committeeId = (req.body as { committeeId?: string })?.committeeId;
  if (!committeeId || typeof committeeId !== 'string') {
    sendBadRequest(res, 'committeeId is required');
    return;
  }
  (req.params as { id: string }).id = committeeId;
  await startRound(req, res);
};

export const assignTurn = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendUnauthorized(res, 'Unauthorized');
      return;
    }
    const roundId = req.params.id;
    const { method, memberId } = (req.body || {}) as { method?: string; memberId?: string };

    const round = await prisma.round.findUnique({
      where: { id: roundId },
      include: {
        committee: {
          include: {
            members: { include: { user: { select: { id: true, name: true } } } },
          },
        },
      },
    });
    if (!round) {
      sendNotFound(res, 'Round not found');
      return;
    }
    if (!canManageCommittee(req.user.id, req.user.role, round.committee.adminId)) {
      sendForbidden(res, 'Only the organizer or a platform moderator can assign the payout');
      return;
    }
    if (round.status !== 'ACTIVE') {
      sendBadRequest(res, 'Only an active round can receive a payout assignment');
      return;
    }
    if (round.payoutUserId) {
      sendBadRequest(res, 'This round already has a payout recipient');
      return;
    }

    const memberUserIds = round.committee.members.map((m) => m.userId);
    const hadPayout = await prisma.round.findMany({
      where: {
        committeeId: round.committeeId,
        status: 'COMPLETED',
        payoutUserId: { not: null },
      },
      select: { payoutUserId: true },
    });
    const received = new Set(hadPayout.map((r) => r.payoutUserId!));
    let pool = round.committee.members.filter((m) => !received.has(m.userId));
    if (!pool.length) pool = [...round.committee.members];

    const mlow = (method || '').toLowerCase();
    let chosen: string | null = null;

    if (mlow === 'manual') {
      if (!memberId || !memberUserIds.includes(memberId)) {
        sendBadRequest(res, 'memberId must be a committee member user id');
        return;
      }
      chosen = memberId;
    } else if (mlow === 'spin' || mlow === 'random') {
      const pick = pool[Math.floor(Math.random() * pool.length)];
      chosen = pick.userId;
    } else {
      sendBadRequest(res, 'method must be manual, spin, or random');
      return;
    }

    const updated = await prisma.round.update({
      where: { id: roundId },
      data: { payoutUserId: chosen },
    });
    await evaluateBadges(chosen);
    sendSuccess(res, updated, 'Payout recipient assigned');
  } catch (err) {
    sendError(res, 'Failed to assign turn', 500, String(err));
  }
};
