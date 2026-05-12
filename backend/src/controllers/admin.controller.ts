import { Response } from 'express';
import prisma from '../prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  sendSuccess,
  sendError,
  sendNotFound,
  sendForbidden,
} from '../utils/response.utils';
import { evaluateBadges } from '../utils/badge.engine';
import { isPlatformAdmin } from '../utils/committee.access';

export const adminRemoveCommitteeMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!isPlatformAdmin(req.user!.role)) {
      sendForbidden(res, 'Only a platform moderator can remove members this way');
      return;
    }
    const { committeeId, memberId } = req.params;

    const member = await prisma.committeeMember.findFirst({
      where: { id: memberId, committeeId },
      include: { user: { select: { id: true, role: true } } },
    });
    if (!member) {
      sendNotFound(res, 'Member not found on this committee');
      return;
    }
    if (member.user.role === 'ADMIN') {
      sendForbidden(res, 'Platform moderators cannot be removed from committees');
      return;
    }

    await prisma.committeeMember.delete({ where: { id: memberId } });
    await evaluateBadges(member.userId);
    sendSuccess(res, null, 'Member removed by moderator');
  } catch (err) {
    sendError(res, 'Failed to remove member', 500, String(err));
  }
};

export const adminOverview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!isPlatformAdmin(req.user!.role)) {
      sendForbidden(res, 'Only a platform moderator can view this overview');
      return;
    }

    const [userCount, committeeCount, roundCount, activeRounds, paymentsPending] = await Promise.all([
      prisma.user.count(),
      prisma.committee.count(),
      prisma.round.count(),
      prisma.round.count({ where: { status: 'ACTIVE' } }),
      prisma.payment.count({ where: { status: 'PENDING' } }),
    ]);

    const committees = await prisma.committee.findMany({
      take: 200,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        status: true,
        monthlyAmount: true,
        totalSlots: true,
        admin: { select: { id: true, name: true, email: true } },
        _count: { select: { members: true, rounds: true } },
      },
    });

    const users = await prisma.user.findMany({
      take: 200,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        trustScore: true,
        createdAt: true,
        _count: { select: { committees: true } },
      },
    });

    const rounds = await prisma.round.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        roundNumber: true,
        status: true,
        payoutUserId: true,
        committee: { select: { id: true, name: true } },
      },
    });

    sendSuccess(
      res,
      {
        summary: {
          users: userCount,
          committees: committeeCount,
          rounds: roundCount,
          activeRounds,
          paymentsPending,
        },
        committees,
        users,
        rounds,
      },
      'Admin overview',
    );
  } catch (err) {
    sendError(res, 'Failed to load overview', 500, String(err));
  }
};
