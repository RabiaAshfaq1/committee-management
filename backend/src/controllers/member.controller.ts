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
} from '../utils/response.utils';
import bcrypt from 'bcryptjs';
import { persistTrustScore } from '../utils/trust.score';
import { evaluateBadges } from '../utils/badge.engine';

function canViewMemberTrust(_req: AuthRequest, _memberId: string): boolean {
  return true;
}

export const getAllMembers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search, status, page = '1', limit = '10' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;
    const where: Record<string, unknown> = {};
    if (status === 'active') where['isActive'] = true;
    if (status === 'inactive') where['isActive'] = false;
    if (search) {
      where['OR'] = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { cnic: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [members, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limitNum,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          cnic: true,
          role: true,
          avatar: true,
          trustScore: true,
          isActive: true,
          createdAt: true,
          _count: { select: { committees: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);
    sendSuccess(res, members, 'Members fetched', 200, { total, page: pageNum, limit: limitNum });
  } catch (err) {
    sendError(res, 'Failed to fetch members', 500, String(err));
  }
};

export const getMemberById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const member = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        cnic: true,
        role: true,
        avatar: true,
        trustScore: true,
        isActive: true,
        createdAt: true,
        committees: {
          include: {
            committee: {
              select: {
                id: true,
                name: true,
                status: true,
                monthlyAmount: true,
                admin: { select: { id: true, name: true, email: true } },
              },
            },
          },
        },
      },
    });
    if (!member) {
      sendNotFound(res, 'Member not found');
      return;
    }
    sendSuccess(res, member);
  } catch (err) {
    sendError(res, 'Failed to fetch member', 500, String(err));
  }
};

export const getMemberProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!canViewMemberTrust(req, id)) {
      sendForbidden(res, 'Access denied');
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        cnic: true,
        role: true,
        avatar: true,
        isActive: true,
        createdAt: true,
      },
    });
    if (!user) {
      sendNotFound(res, 'User not found');
      return;
    }

    const [
      trust,
      userBadges,
      totalJoined,
      completedCount,
      paidCount,
      totalPayments,
      avgRatingRow,
      timeline,
      feedbackReceived,
      allBadges,
    ] = await Promise.all([
      persistTrustScore(id),
      prisma.userBadge.findMany({
        where: { userId: id },
        include: { badge: true },
        orderBy: { earnedAt: 'desc' },
      }),
      prisma.committeeMember.count({ where: { userId: id } }),
      prisma.committeeMember.count({
        where: { userId: id, committee: { status: 'COMPLETED' } },
      }),
      prisma.payment.count({ where: { userId: id, status: 'PAID' } }),
      prisma.payment.count({ where: { userId: id } }),
      prisma.feedback.aggregate({
        where: { toUserId: id },
        _avg: { rating: true },
      }),
      prisma.committeeMember.findMany({
        where: { userId: id },
        take: 30,
        orderBy: { createdAt: 'desc' },
        include: {
          committee: {
            select: {
              id: true,
              name: true,
              status: true,
              monthlyAmount: true,
              startDate: true,
              admin: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.feedback.findMany({
        where: { toUserId: id },
        include: {
          fromUser: { select: { id: true, name: true, email: true } },
          committee: { select: { id: true, name: true } },
          round: { select: { id: true, roundNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.badge.findMany({ orderBy: { name: 'asc' } }),
    ]);

    const paymentSuccessRate =
      totalPayments === 0 ? 100 : Math.round((paidCount / totalPayments) * 1000) / 10;
    const averageRating = avgRatingRow._avg.rating ?? null;

    const committeeHistory = await Promise.all(
      timeline.map(async (tm) => {
        const cid = tm.committee.id;
        const [roundCount, payments] = await Promise.all([
          prisma.round.count({ where: { committeeId: cid } }),
          prisma.payment.findMany({
            where: { userId: id, round: { committeeId: cid } },
            select: { status: true },
          }),
        ]);
        const totalPay = payments.length;
        const paidCnt = payments.filter((p) => p.status === 'PAID').length;
        const ratePct = totalPay === 0 ? 100 : Math.round((paidCnt / totalPay) * 1000) / 10;
        let statusLabel = 'Active';
        if (tm.committee.status === 'COMPLETED') statusLabel = 'Completed';
        else if (tm.committee.status === 'PAUSED') statusLabel = 'Paused';
        return {
          committeeId: cid,
          name: tm.committee.name,
          committeeStatus: tm.committee.status,
          statusLabel,
          startDate: tm.committee.startDate,
          monthlyAmount: tm.committee.monthlyAmount,
          roundsCount: roundCount,
          paidCount: paidCnt,
          totalPayments: totalPay,
          paymentRatePct: ratePct,
          turnNumber: tm.turnNumber,
        };
      }),
    );

    sendSuccess(
      res,
      {
        user: { ...user, trustScore: trust.score },
        trustScore: trust,
        badges: userBadges.map((ub) => ({
          id: ub.badge.id,
          name: ub.badge.name,
          icon: ub.badge.icon,
          color: ub.badge.color,
          description: ub.badge.description,
          earnedAt: ub.earnedAt,
        })),
        allBadges,
        feedbackReceived: feedbackReceived.map((f) => ({
          rating: f.rating,
          comment: f.comment,
          fromUserName: f.fromUser.name,
          createdAt: f.createdAt,
          committeeName: f.committee.name,
          roundNumber: f.round?.roundNumber ?? null,
        })),
        stats: {
          totalCommitteesJoined: totalJoined,
          committeesCompleted: completedCount,
          paymentSuccessRate,
          averageRating,
        },
        timeline,
        committeeHistory,
      },
      'Trust profile fetched',
    );
  } catch (err) {
    sendError(res, 'Failed to fetch trust profile', 500, String(err));
  }
};

export const getMemberHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!canViewMemberTrust(req, id)) {
      sendForbidden(res, 'Access denied');
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, role: true },
    });
    if (!user) {
      sendNotFound(res, 'User not found');
      return;
    }

    const memberships = await prisma.committeeMember.findMany({
      where: { userId: id },
      include: {
        committee: {
          select: {
            id: true,
            name: true,
            status: true,
            monthlyAmount: true,
            admin: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const payoutRounds = await prisma.round.findMany({
      where: { payoutUserId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        roundNumber: true,
        status: true,
        recipientTransactionId: true,
        dueDate: true,
        createdAt: true,
        committee: { select: { id: true, name: true } },
      },
    });

    const summary = {
      committeesJoined: memberships.length,
      timesReceivedPayout: payoutRounds.filter((r) => r.status === 'COMPLETED').length,
      payoutProofRecorded: payoutRounds.filter((r) => !!r.recipientTransactionId).length,
    };

    sendSuccess(res, { memberships, payoutRounds, summary }, 'History fetched');
  } catch (err) {
    sendError(res, 'Failed to fetch history', 500, String(err));
  }
};

export const getMemberBadges = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!canViewMemberTrust(req, id)) {
      sendForbidden(res, 'Access denied');
      return;
    }
    const list = await prisma.userBadge.findMany({
      where: { userId: id },
      include: { badge: true },
      orderBy: { earnedAt: 'desc' },
    });
    sendSuccess(res, list, 'Badges fetched');
  } catch (err) {
    sendError(res, 'Failed to fetch badges', 500, String(err));
  }
};

export const getMemberTrustScore = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!canViewMemberTrust(req, id)) {
      sendForbidden(res, 'Access denied');
      return;
    }
    const user = await prisma.user.findUnique({
      where: { id },
      select: { role: true },
    });
    if (!user) {
      sendNotFound(res, 'User not found');
      return;
    }
    const trust = await persistTrustScore(id);
    sendSuccess(res, trust, 'Trust score fetched');
  } catch (err) {
    sendError(res, 'Failed to fetch trust score', 500, String(err));
  }
};

export const createMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, email, phone, cnic, password } = req.body;
    if (!name || !email || !password) {
      sendBadRequest(res, 'Name, email and password are required');
      return;
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      sendBadRequest(res, 'Email already exists');
      return;
    }
    const hashed = await bcrypt.hash(password, 12);
    const member = await prisma.user.create({
      data: { name, email, phone, cnic, password: hashed, role: 'MEMBER' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        cnic: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
    sendCreated(res, member, 'Member created');
  } catch (err) {
    sendError(res, 'Failed to create member', 500, String(err));
  }
};

export const updateMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, phone, cnic, isActive } = req.body;
    const member = await prisma.user.findUnique({ where: { id } });
    if (!member) {
      sendNotFound(res, 'Member not found');
      return;
    }

    if (req.user!.role === 'MEMBER') {
      if (req.user!.id !== id) {
        sendForbidden(res, 'You can only update your own profile');
        return;
      }
      const updated = await prisma.user.update({
        where: { id },
        data: {
          name: name ?? member.name,
          phone: phone ?? member.phone,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          cnic: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });
      if (member.role === 'MEMBER') {
        await evaluateBadges(id);
      }
      sendSuccess(res, updated, 'Profile updated');
      return;
    }

    if (req.user!.role !== 'ADMIN') {
      sendForbidden(res);
      return;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        name: name ?? member.name,
        phone: phone ?? member.phone,
        cnic: cnic ?? member.cnic,
        isActive: isActive !== undefined ? isActive : member.isActive,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        cnic: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
    if (member.role === 'MEMBER') {
      await evaluateBadges(id);
    }
    sendSuccess(res, updated, 'Member updated');
  } catch (err) {
    sendError(res, 'Failed to update member', 500, String(err));
  }
};

export const deactivateMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.user.update({ where: { id }, data: { isActive: false } });
    sendSuccess(res, null, 'Member deactivated');
  } catch (err) {
    sendError(res, 'Failed to deactivate member', 500, String(err));
  }
};
