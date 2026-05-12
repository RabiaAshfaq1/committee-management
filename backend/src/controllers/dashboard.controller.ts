import { Response } from 'express';
import prisma from '../prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess, sendError } from '../utils/response.utils';
import { isPlatformAdmin } from '../utils/committee.access';

/** Committees the user organizes or belongs to. */
async function myCommitteeIds(userId: string): Promise<string[]> {
  const [organized, joined] = await Promise.all([
    prisma.committee.findMany({ where: { adminId: userId }, select: { id: true } }),
    prisma.committeeMember.findMany({ where: { userId }, select: { committeeId: true } }),
  ]);
  const ids = new Set<string>();
  organized.forEach((c) => ids.add(c.id));
  joined.forEach((m) => ids.add(m.committeeId));
  return [...ids];
}

export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;
    const platformAdmin = isPlatformAdmin(role);

    const userRow = await prisma.user.findUnique({
      where: { id: userId },
      select: { trustScore: true },
    });
    const trustScore = userRow?.trustScore ?? 0;

    if (platformAdmin) {
      const [totalCommittees, activeRounds, pendingConfirmations, pendingMyPayments, peopleInNetwork] =
        await Promise.all([
          prisma.committee.count(),
          prisma.round.count({ where: { status: 'ACTIVE' } }),
          prisma.payment.count({
            where: { status: 'PENDING', transactionId: { not: null } },
          }),
          prisma.payment.count({ where: { userId, status: 'PENDING' } }),
          prisma.user.count({ where: { isActive: true } }),
        ]);

      sendSuccess(
        res,
        {
          totalCommittees,
          myCommitteesCount: totalCommittees,
          activeRounds,
          activeRoundsCount: activeRounds,
          pendingPaymentsCount: pendingConfirmations,
          pendingMyPayments,
          pendingConfirmations,
          peopleInNetwork,
          completedRounds: await prisma.round.count({ where: { status: 'COMPLETED' } }),
          trustScore,
          role,
          scope: 'platform',
        },
        'Dashboard stats fetched',
      );
      return;
    }

    const committeeIds = await myCommitteeIds(userId);
    const committeeFilter =
      committeeIds.length === 0 ? { id: { in: [] as string[] } } : { id: { in: committeeIds } };

    const [totalCommittees, activeRounds, completedRounds, pendingMyPayments, pendingConfirmations] =
      await Promise.all([
        prisma.committee.count({ where: committeeFilter }),
        prisma.round.count({
          where: { status: 'ACTIVE', committee: committeeFilter },
        }),
        prisma.round.count({
          where: { status: 'COMPLETED', committee: committeeFilter },
        }),
        prisma.payment.count({ where: { userId, status: 'PENDING' } }),
        committeeIds.length === 0
          ? 0
          : prisma.payment.count({
              where: {
                status: 'PENDING',
                transactionId: { not: null },
                round: { committeeId: { in: committeeIds } },
              },
            }),
      ]);

    const uniqueMemberCount =
      committeeIds.length === 0
        ? 0
        : (
            await prisma.committeeMember.findMany({
              where: { committeeId: { in: committeeIds } },
              distinct: ['userId'],
              select: { userId: true },
            })
          ).length;

    sendSuccess(
      res,
      {
        totalCommittees,
        myCommitteesCount: totalCommittees,
        peopleInNetwork: uniqueMemberCount,
        activeRounds,
        activeRoundsCount: activeRounds,
        completedRounds,
        pendingPaymentsCount: pendingMyPayments,
        pendingMyPayments,
        pendingConfirmations,
        trustScore,
        role,
        scope: 'personal',
      },
      'Dashboard stats fetched',
    );
  } catch (err) {
    sendError(res, 'Failed to fetch stats', 500, String(err));
  }
};

export const getRecentActivity = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const platformAdmin = isPlatformAdmin(req.user!.role);

    if (platformAdmin) {
      const [recentCommittees, recentRounds, recentPayments] = await Promise.all([
        prisma.committee.findMany({
          take: 4,
          orderBy: { createdAt: 'desc' },
          select: { id: true, name: true, createdAt: true, status: true },
        }),
        prisma.round.findMany({
          take: 6,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            roundNumber: true,
            status: true,
            recipientTransactionId: true,
            createdAt: true,
            committee: { select: { name: true } },
          },
        }),
        prisma.payment.findMany({
          where: { OR: [{ status: 'PAID' }, { transactionId: { not: null } }] },
          take: 6,
          orderBy: { createdAt: 'desc' },
          select: {
            status: true,
            transactionId: true,
            createdAt: true,
            user: { select: { name: true } },
            round: { select: { roundNumber: true, committee: { select: { name: true } } } },
          },
        }),
      ]);

      const activities = [
        ...recentCommittees.map((c) => ({
          type: 'committee' as const,
          message: `Committee "${c.name}" · ${c.status}`,
          time: c.createdAt,
        })),
        ...recentRounds.map((r) => ({
          type: 'round' as const,
          message: `Round ${r.roundNumber} (${r.status}) · ${r.committee.name}${
            r.recipientTransactionId ? ' · Payout tx' : ''
          }`,
          time: r.createdAt,
        })),
        ...recentPayments.map((p) => ({
          type: 'payment' as const,
          message: `${p.user.name} · ${p.round.committee.name} R${p.round.roundNumber} · ${p.status}${
            p.transactionId ? ' · Txn' : ''
          }`,
          time: p.createdAt,
        })),
      ]
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        .slice(0, 12);

      sendSuccess(res, activities, 'Recent activity fetched');
      return;
    }

    const committeeIds = await myCommitteeIds(userId);
    const committeeWhere =
      committeeIds.length === 0
        ? { id: { in: [] as string[] } }
        : { id: { in: committeeIds } };

    const [recentCommittees, recentRounds, recentJoins] = await Promise.all([
      prisma.committee.findMany({
        where: committeeWhere,
        take: 4,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, createdAt: true, status: true },
      }),
      prisma.round.findMany({
        where: { committee: committeeWhere },
        take: 6,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          roundNumber: true,
          status: true,
          recipientTransactionId: true,
          createdAt: true,
          committee: { select: { name: true } },
        },
      }),
      prisma.committeeMember.findMany({
        where: { committee: committeeWhere },
        take: 6,
        orderBy: { createdAt: 'desc' },
        select: {
          createdAt: true,
          user: { select: { name: true } },
          committee: { select: { name: true } },
        },
      }),
    ]);

    const activities = [
      ...recentCommittees.map((c) => ({
        type: 'committee' as const,
        message: `Committee "${c.name}" · ${c.status}`,
        time: c.createdAt,
      })),
      ...recentRounds.map((r) => ({
        type: 'round' as const,
        message: `Round ${r.roundNumber} (${r.status}) · ${r.committee.name}${
          r.recipientTransactionId ? ' · Payout tx' : ''
        }`,
        time: r.createdAt,
      })),
      ...recentJoins.map((j) => ({
        type: 'join' as const,
        message: `${j.user.name} joined "${j.committee.name}"`,
        time: j.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 12);

    sendSuccess(res, activities, 'Recent activity fetched');
  } catch (err) {
    sendError(res, 'Failed to fetch activity', 500, String(err));
  }
};
