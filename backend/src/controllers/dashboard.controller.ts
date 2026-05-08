import { Response } from 'express';
import prisma from '../prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess, sendError } from '../utils/response.utils';

export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;

    const committeeWhere = role === 'ORGANIZER' ? { organizerId: userId } :
      role === 'MEMBER' ? { members: { some: { userId } } } : {};

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [
      totalCommittees, totalMembers, activeRounds,
      totalCollectedMonth, pendingPayments, latePayments,
    ] = await Promise.all([
      prisma.committee.count({ where: committeeWhere }),
      prisma.user.count({ where: { role: 'MEMBER', isActive: true } }),
      prisma.round.count({ where: { status: 'ACTIVE', committee: committeeWhere } }),
      prisma.payment.aggregate({
        where: { status: 'PAID', paidAt: { gte: startOfMonth, lte: endOfMonth } },
        _sum: { amount: true },
      }),
      prisma.payment.count({ where: { status: 'PENDING' } }),
      prisma.payment.count({ where: { status: 'LATE' } }),
    ]);

    // Monthly trend (last 6 months)
    const monthlyTrend = await Promise.all(
      Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const start = new Date(d.getFullYear(), d.getMonth(), 1);
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        return prisma.payment.aggregate({
          where: { status: 'PAID', paidAt: { gte: start, lte: end } },
          _sum: { amount: true },
        }).then(result => ({
          month: start.toLocaleString('default', { month: 'short', year: '2-digit' }),
          amount: result._sum.amount || 0,
        }));
      })
    );

    sendSuccess(res, {
      totalCommittees,
      totalMembers,
      activeRounds,
      totalCollectedMonth: totalCollectedMonth._sum.amount || 0,
      pendingPayments,
      latePayments,
      monthlyTrend: monthlyTrend.reverse(),
    }, 'Dashboard stats fetched');
  } catch (err) {
    sendError(res, 'Failed to fetch stats', 500, String(err));
  }
};

export const getRecentActivity = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [recentPayments, recentCommittees, recentRounds] = await Promise.all([
      prisma.payment.findMany({
        where: { status: 'PAID' },
        take: 5, orderBy: { paidAt: 'desc' },
        include: {
          user: { select: { name: true } },
          round: { select: { roundNumber: true, committee: { select: { name: true } } } },
        },
      }),
      prisma.committee.findMany({
        take: 3, orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, createdAt: true, status: true },
      }),
      prisma.round.findMany({
        take: 3, orderBy: { createdAt: 'desc' },
        select: { id: true, roundNumber: true, status: true, createdAt: true,
          committee: { select: { name: true } } },
      }),
    ]);

    const activities = [
      ...recentPayments.map(p => ({
        type: 'payment',
        message: `${p.user.name} paid PKR ${p.amount} for ${p.round.committee.name} Round ${p.round.roundNumber}`,
        time: p.paidAt,
        status: 'paid',
      })),
      ...recentCommittees.map(c => ({
        type: 'committee',
        message: `Committee "${c.name}" was created`,
        time: c.createdAt,
        status: c.status.toLowerCase(),
      })),
      ...recentRounds.map(r => ({
        type: 'round',
        message: `Round ${r.roundNumber} started for "${r.committee.name}"`,
        time: r.createdAt,
        status: r.status.toLowerCase(),
      })),
    ].sort((a, b) => new Date(b.time!).getTime() - new Date(a.time!).getTime()).slice(0, 10);

    sendSuccess(res, activities, 'Recent activity fetched');
  } catch (err) {
    sendError(res, 'Failed to fetch activity', 500, String(err));
  }
};
