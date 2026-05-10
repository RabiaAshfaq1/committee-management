import { Response } from 'express';
import prisma from '../prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  sendSuccess,
  sendCreated,
  sendError,
  sendNotFound,
  sendBadRequest,
  sendForbidden,
  sendUnauthorized,
} from '../utils/response.utils';

type SplitInput = { memberId: string; amount: number };
type BidInput = { userId: string; amount: number };

function pickRandomMemberUserId(members: { userId: string }[]): string | null {
  if (!members.length) return null;
  const i = Math.floor(Math.random() * members.length);
  return members[i].userId;
}

export const startRound = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { committeeId, dueDate, payoutUserId, bids, contributionSplits } = req.body as {
      committeeId?: string;
      dueDate?: string;
      payoutUserId?: string;
      bids?: BidInput[];
      contributionSplits?: SplitInput[];
    };
    if (!committeeId) {
      sendBadRequest(res, 'committeeId is required');
      return;
    }

    const committee = await prisma.committee.findUnique({
      where: { id: committeeId },
      include: { members: { orderBy: { turnNumber: 'asc' } }, rounds: true },
    });
    if (!committee) {
      sendNotFound(res, 'Committee not found');
      return;
    }

    if (committee.organizerId !== req.user!.id) {
      sendForbidden(res, 'You can only start rounds on your own committees');
      return;
    }

    const activeRound = committee.rounds.find((r) => r.status === 'ACTIVE');
    if (activeRound) {
      sendBadRequest(res, 'There is already an active round for this committee');
      return;
    }

    const nextRoundNumber = committee.rounds.length + 1;
    if (nextRoundNumber > committee.durationMonths) {
      sendBadRequest(res, 'All rounds completed for this committee');
      return;
    }

    const memberIds = new Set(committee.members.map((m) => m.id));
    const userIds = new Set(committee.members.map((m) => m.userId));

    let resolvedPayoutUserId: string | null = null;

    if (committee.turnAssignment === 'MANUAL') {
      if (!payoutUserId || !userIds.has(payoutUserId)) {
        sendBadRequest(res, 'payoutUserId is required and must be a committee member');
        return;
      }
      resolvedPayoutUserId = payoutUserId;
    } else if (committee.turnAssignment === 'BIDDING') {
      if (bids && Array.isArray(bids) && bids.length > 0) {
        let best: BidInput | null = null;
        for (const b of bids) {
          if (!userIds.has(b.userId)) {
            sendBadRequest(res, 'Bid userId must be a committee member');
            return;
          }
          if (!best || b.amount > best.amount) best = b;
        }
        resolvedPayoutUserId = best!.userId;
      } else if (payoutUserId && userIds.has(payoutUserId)) {
        resolvedPayoutUserId = payoutUserId;
      } else {
        sendBadRequest(res, 'Provide bids[] or payoutUserId for this round');
        return;
      }
    } else {
      resolvedPayoutUserId = pickRandomMemberUserId(committee.members);
    }

    if (!resolvedPayoutUserId) {
      sendBadRequest(res, 'Could not determine payout recipient');
      return;
    }

    const pool = committee.monthlyAmount;
    let splits: { memberId: string; amount: number }[];

    if (contributionSplits && contributionSplits.length > 0) {
      let sum = 0;
      splits = [];
      for (const s of contributionSplits) {
        if (!memberIds.has(s.memberId)) {
          sendBadRequest(res, 'Invalid memberId in contributionSplits');
          return;
        }
        const amt = Number(s.amount);
        if (amt <= 0) {
          sendBadRequest(res, 'Split amounts must be positive');
          return;
        }
        sum += amt;
        splits.push({ memberId: s.memberId, amount: amt });
      }
      if (Math.abs(sum - pool) > 0.01) {
        sendBadRequest(res, `Contribution splits must sum to monthly pool (${pool})`);
        return;
      }
    } else {
      const n = committee.members.length;
      if (n === 0) {
        sendBadRequest(res, 'Committee has no members');
        return;
      }
      const each = pool / n;
      splits = committee.members.map((m) => ({ memberId: m.id, amount: each }));
    }

    const round = await prisma.round.create({
      data: {
        committeeId,
        roundNumber: nextRoundNumber,
        payoutUserId: resolvedPayoutUserId,
        payoutAmount: pool,
        status: 'ACTIVE',
        dueDate: dueDate ? new Date(dueDate) : null,
        contributionSplits: {
          create: splits.map((s) => ({ memberId: s.memberId, amount: s.amount })),
        },
      },
      include: {
        contributionSplits: {
          include: {
            member: {
              include: { user: { select: { id: true, name: true, email: true } } },
            },
          },
        },
      },
    });

    sendCreated(res, round, 'Round started');
  } catch (err) {
    sendError(res, 'Failed to start round', 500, String(err));
  }
};

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
    } else if (req.user.role === 'ORGANIZER' && committee.organizerId !== req.user.id) {
      sendForbidden(res, 'Access denied');
      return;
    }

    const rounds = await prisma.round.findMany({
      where: { committeeId },
      include: {
        contributionSplits: {
          include: {
            member: {
              include: { user: { select: { id: true, name: true, email: true } } },
            },
          },
        },
        committee: {
          select: {
            name: true,
            monthlyAmount: true,
            durationMonths: true,
            totalMembers: true,
            organizerId: true,
            turnAssignment: true,
            members: {
              select: {
                id: true,
                turnNumber: true,
                userId: true,
                user: { select: { id: true, name: true, email: true } },
              },
              orderBy: { turnNumber: 'asc' },
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

export const submitPayoutTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendUnauthorized(res, 'Unauthorized');
      return;
    }
    const { roundId } = req.params;
    const { transactionId } = req.body as { transactionId?: string };
    if (!transactionId || !String(transactionId).trim()) {
      sendBadRequest(res, 'transactionId is required');
      return;
    }

    const round = await prisma.round.findUnique({
      where: { id: roundId },
      include: { committee: { select: { organizerId: true } } },
    });
    if (!round) {
      sendNotFound(res, 'Round not found');
      return;
    }
    if (round.status !== 'ACTIVE') {
      sendBadRequest(res, 'Only an active round accepts a transaction id');
      return;
    }

    const isRecipient = round.payoutUserId === req.user.id;
    const isOrganizer = round.committee.organizerId === req.user.id;
    if (!isRecipient && !isOrganizer) {
      sendForbidden(res, 'Only the recipient or organizer can submit the transaction id');
      return;
    }

    const updated = await prisma.round.update({
      where: { id: roundId },
      data: { payoutTransactionId: String(transactionId).trim() },
    });
    sendSuccess(res, updated, 'Transaction id saved');
  } catch (err) {
    sendError(res, 'Failed to save transaction id', 500, String(err));
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
      include: { committee: { select: { organizerId: true } } },
    });
    if (!round) {
      sendNotFound(res, 'Round not found');
      return;
    }

    if (round.committee.organizerId !== req.user.id) {
      sendForbidden(res, 'Access denied');
      return;
    }

    if (round.status === 'COMPLETED') {
      sendBadRequest(res, 'Round already completed');
      return;
    }

    const updated = await prisma.round.update({
      where: { id },
      data: { status: 'COMPLETED' },
    });

    sendSuccess(res, updated, 'Round completed');
  } catch (err) {
    sendError(res, 'Failed to complete round', 500, String(err));
  }
};
