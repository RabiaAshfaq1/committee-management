import { Response } from 'express';
import prisma from '../prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess, sendCreated, sendError, sendNotFound, sendBadRequest } from '../utils/response.utils';

export const startRound = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { committeeId, dueDate } = req.body;
    if (!committeeId) { sendBadRequest(res, 'committeeId is required'); return; }

    const committee = await prisma.committee.findUnique({
      where: { id: committeeId },
      include: { members: { orderBy: { turnNumber: 'asc' } }, rounds: true },
    });
    if (!committee) { sendNotFound(res, 'Committee not found'); return; }

    const activeRound = committee.rounds.find(r => r.status === 'ACTIVE');
    if (activeRound) { sendBadRequest(res, 'There is already an active round for this committee'); return; }

    const nextRoundNumber = committee.rounds.length + 1;
    if (nextRoundNumber > committee.durationMonths) {
      sendBadRequest(res, 'All rounds completed for this committee'); return;
    }

    const payoutMember = committee.members.find(m => m.turnNumber === nextRoundNumber);

    const round = await prisma.round.create({
      data: {
        committeeId,
        roundNumber: nextRoundNumber,
        payoutUserId: payoutMember?.userId || null,
        payoutAmount: committee.monthlyAmount * committee.members.length,
        status: 'ACTIVE',
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    // Auto-create payment records for all members
    const payments = committee.members.map(m => ({
      roundId: round.id,
      memberId: m.id,
      userId: m.userId,
      amount: committee.monthlyAmount,
      status: 'PENDING' as const,
    }));
    await prisma.payment.createMany({ data: payments });

    const roundWithPayments = await prisma.round.findUnique({
      where: { id: round.id },
      include: { payments: { include: { user: { select: { id: true, name: true } } } } },
    });

    sendCreated(res, roundWithPayments, 'Round started successfully');
  } catch (err) {
    sendError(res, 'Failed to start round', 500, String(err));
  }
};

export const getRoundsByCommittee = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { committeeId } = req.params;
    const rounds = await prisma.round.findMany({
      where: { committeeId },
      include: {
        payments: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
      orderBy: { roundNumber: 'asc' },
    });
    sendSuccess(res, rounds, 'Rounds fetched');
  } catch (err) {
    sendError(res, 'Failed to fetch rounds', 500, String(err));
  }
};

export const completeRound = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const round = await prisma.round.findUnique({
      where: { id },
      include: { payments: true },
    });
    if (!round) { sendNotFound(res, 'Round not found'); return; }
    if (round.status === 'COMPLETED') { sendBadRequest(res, 'Round already completed'); return; }

    // Auto mark unpaid payments as LATE
    const overdueIds = round.payments
      .filter(p => p.status === 'PENDING')
      .map(p => p.id);

    if (overdueIds.length > 0) {
      await prisma.payment.updateMany({
        where: { id: { in: overdueIds } },
        data: { status: 'LATE' },
      });
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
