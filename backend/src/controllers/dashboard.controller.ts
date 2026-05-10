import { Response } from 'express';
import prisma from '../prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess, sendError } from '../utils/response.utils';

export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;

    const committeeWhere =
      role === 'ORGANIZER'
        ? { organizerId: userId }
        : { members: { some: { userId } } };

    const committeeIds =
      role === 'ORGANIZER'
        ? (
            await prisma.committee.findMany({
              where: { organizerId: userId },
              select: { id: true },
            })
          ).map((c) => c.id)
        : (
            await prisma.committeeMember.findMany({
              where: { userId },
              select: { committeeId: true },
            })
          ).map((m) => m.committeeId);

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

    const [totalCommittees, activeRounds, completedRounds] = await Promise.all([
      prisma.committee.count({ where: committeeWhere }),
      prisma.round.count({
        where: { status: 'ACTIVE', committee: committeeWhere },
      }),
      prisma.round.count({
        where: { status: 'COMPLETED', committee: committeeWhere },
      }),
    ]);

    sendSuccess(
      res,
      {
        totalCommittees,
        peopleInNetwork: uniqueMemberCount,
        activeRounds,
        completedRounds,
        role,
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
    const role = req.user!.role;

    const committeeWhere =
      role === 'ORGANIZER'
        ? { organizerId: userId }
        : { members: { some: { userId } } };

    const [recentCommittees, recentRounds] = await Promise.all([
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
          payoutTransactionId: true,
          createdAt: true,
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
          r.payoutTransactionId ? ' · Tx recorded' : ''
        }`,
        time: r.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 12);

    sendSuccess(res, activities, 'Recent activity fetched');
  } catch (err) {
    sendError(res, 'Failed to fetch activity', 500, String(err));
  }
};
