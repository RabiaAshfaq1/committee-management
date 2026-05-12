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
import { evaluateBadges } from '../utils/badge.engine';
import { canManageCommittee } from '../utils/committee.access';

export const createCommittee = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      name,
      description,
      totalSlots,
      monthlyAmount,
      startDate,
      durationMonths,
      turnMethod,
    } = req.body;

    if (!name || !totalSlots || !monthlyAmount || !startDate || !durationMonths) {
      sendBadRequest(res, 'Missing required fields');
      return;
    }

    const committee = await prisma.committee.create({
      data: {
        name,
        description,
        totalSlots: Number(totalSlots),
        monthlyAmount: Number(monthlyAmount),
        startDate: new Date(startDate),
        durationMonths: Number(durationMonths),
        turnMethod: turnMethod || 'MANUAL',
        adminId: req.user!.id,
      },
      include: {
        admin: { select: { id: true, name: true, email: true } },
        _count: { select: { members: true, rounds: true } },
      },
    });

    sendCreated(res, committee, 'Committee created successfully');
  } catch (err) {
    sendError(res, 'Failed to create committee', 500, String(err));
  }
};

export const getAllCommittees = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, search, page = '1', limit = '10' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, unknown> = {};
    if (status) where['status'] = status;
    if (search) where['name'] = { contains: search, mode: 'insensitive' };

    const [rows, total] = await Promise.all([
      prisma.committee.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          admin: { select: { id: true, name: true, email: true } },
          members: { select: { shareCount: true } },
          _count: { select: { members: true, rounds: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.committee.count({ where }),
    ]);

    const committeeIds = rows.map((r) => r.id);
    const completedRows =
      committeeIds.length === 0
        ? []
        : await prisma.round.groupBy({
            by: ['committeeId'],
            where: { committeeId: { in: committeeIds }, status: 'COMPLETED' },
            _count: { _all: true },
          });
    const completedMap = Object.fromEntries(completedRows.map((g) => [g.committeeId, g._count._all]));

    const committees = rows.map(({ members, ...c }) => ({
      ...c,
      slotsFilled: members.reduce((s, m) => s + m.shareCount, 0),
      completedRounds: completedMap[c.id] ?? 0,
    }));

    sendSuccess(res, committees, 'Committees fetched', 200, {
      total,
      page: pageNum,
      limit: limitNum,
    });
  } catch (err) {
    sendError(res, 'Failed to fetch committees', 500, String(err));
  }
};

export const getCommitteeById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const committee = await prisma.committee.findUnique({
      where: { id },
      include: {
        admin: { select: { id: true, name: true, email: true } },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, phone: true, cnic: true, avatar: true, trustScore: true },
            },
          },
          orderBy: { turnNumber: 'asc' },
        },
        rounds: {
          orderBy: { roundNumber: 'asc' },
          include: {
            payments: { include: { user: { select: { id: true, name: true } } } },
          },
        },
      },
    });

    if (!committee) {
      sendNotFound(res, 'Committee not found');
      return;
    }

    sendSuccess(res, committee, 'Committee fetched');
  } catch (err) {
    sendError(res, 'Failed to fetch committee', 500, String(err));
  }
};

export const updateCommittee = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, status, monthlyAmount, durationMonths, turnMethod } = req.body;

    const committee = await prisma.committee.findUnique({ where: { id } });
    if (!committee) {
      sendNotFound(res, 'Committee not found');
      return;
    }

    if (!canManageCommittee(req.user!.id, req.user!.role, committee.adminId)) {
      sendForbidden(res, 'Only the committee organizer or a platform moderator can update');
      return;
    }

    const updated = await prisma.committee.update({
      where: { id },
      data: {
        name: name ?? committee.name,
        description: description ?? committee.description,
        status: status ?? committee.status,
        monthlyAmount: monthlyAmount ? Number(monthlyAmount) : committee.monthlyAmount,
        durationMonths: durationMonths ? Number(durationMonths) : committee.durationMonths,
        turnMethod: turnMethod ?? committee.turnMethod,
      },
      include: {
        admin: { select: { id: true, name: true, email: true } },
      },
    });

    sendSuccess(res, updated, 'Committee updated');
  } catch (err) {
    sendError(res, 'Failed to update committee', 500, String(err));
  }
};

export const deleteCommittee = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const committee = await prisma.committee.findUnique({ where: { id } });
    if (!committee) {
      sendNotFound(res, 'Committee not found');
      return;
    }

    if (!canManageCommittee(req.user!.id, req.user!.role, committee.adminId)) {
      sendForbidden(res, 'Only the organizer or a platform moderator can delete this committee');
      return;
    }

    await prisma.committee.delete({ where: { id } });

    sendSuccess(res, null, 'Committee deleted');
  } catch (err) {
    sendError(res, 'Failed to delete committee', 500, String(err));
  }
};

export const addMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id: committeeId } = req.params;
    const { userId, turnNumber, shareCount, shareAmount } = req.body;

    const committee = await prisma.committee.findUnique({
      where: { id: committeeId },
      include: { members: true },
    });
    if (!committee) {
      sendNotFound(res, 'Committee not found');
      return;
    }

    if (!canManageCommittee(req.user!.id, req.user!.role, committee.adminId)) {
      sendForbidden(res, 'Only the organizer or a platform moderator can add members');
      return;
    }

    const slotsFilled = committee.members.reduce((s, m) => s + m.shareCount, 0);
    const newShares = Number(shareCount) > 0 ? Number(shareCount) : 1;
    if (slotsFilled + newShares > committee.totalSlots) {
      sendBadRequest(res, 'Committee slots would exceed totalSlots');
      return;
    }

    if (!userId || turnNumber === undefined || turnNumber === null) {
      sendBadRequest(res, 'userId and turnNumber are required');
      return;
    }

    const alreadyMember = committee.members.find((m) => m.userId === userId);
    if (alreadyMember) {
      sendBadRequest(res, 'User is already a member of this committee');
      return;
    }

    const existingTurn = committee.members.find((m) => m.turnNumber === Number(turnNumber));
    if (existingTurn) {
      sendBadRequest(res, `Turn number ${turnNumber} is already taken`);
      return;
    }

    const defaultShare =
      shareAmount !== undefined && shareAmount !== null
        ? Number(shareAmount)
        : (committee.monthlyAmount / committee.totalSlots) * newShares;

    const member = await prisma.committeeMember.create({
      data: {
        userId,
        committeeId,
        turnNumber: Number(turnNumber),
        shareCount: newShares,
        shareAmount: defaultShare,
      },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    });

    await evaluateBadges(userId);

    sendCreated(res, member, 'Member added to committee');
  } catch (err) {
    sendError(res, 'Failed to add member', 500, String(err));
  }
};

export const removeMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id: committeeId, memberId } = req.params;
    const member = await prisma.committeeMember.findFirst({
      where: { id: memberId, committeeId },
      include: { committee: { select: { adminId: true } } },
    });
    if (!member) {
      sendNotFound(res, 'Member not found on this committee');
      return;
    }

    if (!canManageCommittee(req.user!.id, req.user!.role, member.committee.adminId)) {
      sendForbidden(res, 'Only the organizer or a platform moderator can remove members');
      return;
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: member.userId },
      select: { role: true },
    });
    if (targetUser?.role === 'ADMIN') {
      sendForbidden(res, 'Platform moderators cannot be removed from committees');
      return;
    }

    await prisma.committeeMember.delete({ where: { id: memberId } });
    await evaluateBadges(member.userId);
    sendSuccess(res, null, 'Member removed from committee');
  } catch (err) {
    sendError(res, 'Failed to remove member', 500, String(err));
  }
};

export const assignTurns = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id: committeeId } = req.params;
    const { assignments } = req.body as { assignments?: { memberId: string; turnNumber: number }[] };

    const committee = await prisma.committee.findUnique({
      where: { id: committeeId },
      include: { members: true },
    });
    if (!committee) {
      sendNotFound(res, 'Committee not found');
      return;
    }

    if (!canManageCommittee(req.user!.id, req.user!.role, committee.adminId)) {
      sendForbidden(res, 'Only the organizer or a platform moderator can assign turns');
      return;
    }

    const hasAssignments = Array.isArray(assignments) && assignments.length > 0;
    const memberIdSet = new Set(committee.members.map((m) => m.id));

    if (hasAssignments) {
      for (const a of assignments!) {
        if (!memberIdSet.has(a.memberId)) {
          sendBadRequest(res, 'assignments must use roster member ids for this committee');
          return;
        }
      }
      await Promise.all(
        assignments!.map((a) =>
          prisma.committeeMember.update({
            where: { id: a.memberId },
            data: { turnNumber: Number(a.turnNumber) },
          }),
        ),
      );
    } else if (committee.turnMethod === 'SPIN') {
      const members = [...committee.members];
      for (let i = members.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [members[i], members[j]] = [members[j], members[i]];
      }
      await Promise.all(
        members.map((m, idx) =>
          prisma.committeeMember.update({
            where: { id: m.id },
            data: { turnNumber: idx + 1 },
          }),
        ),
      );
    } else {
      sendBadRequest(res, 'Provide assignments[] for MANUAL / BIDDING, or use SPIN for random order');
      return;
    }

    const updatedMembers = await prisma.committeeMember.findMany({
      where: { committeeId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { turnNumber: 'asc' },
    });

    sendSuccess(res, updatedMembers, 'Turns assigned successfully');
  } catch (err) {
    sendError(res, 'Failed to assign turns', 500, String(err));
  }
};

type BidInput = { userId: string; amount: number };

export const startRound = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id: committeeId } = req.params;
    const { dueDate, payoutUserId, bids } = req.body as {
      dueDate?: string;
      payoutUserId?: string;
      bids?: BidInput[];
    };

    const committee = await prisma.committee.findUnique({
      where: { id: committeeId },
      include: { members: { orderBy: { turnNumber: 'asc' } }, rounds: true },
    });
    if (!committee) {
      sendNotFound(res, 'Committee not found');
      return;
    }
    if (!canManageCommittee(req.user!.id, req.user!.role, committee.adminId)) {
      sendForbidden(res, 'Only the organizer or a platform moderator can start a round');
      return;
    }

    const active = committee.rounds.find((r) => r.status === 'ACTIVE');
    if (active) {
      sendBadRequest(res, 'There is already an active round');
      return;
    }

    const nextNum = committee.rounds.length + 1;
    if (nextNum > committee.durationMonths) {
      sendBadRequest(res, 'All rounds completed for this committee');
      return;
    }

    const userIds = new Set(committee.members.map((m) => m.userId));
    let resolvedPayout: string | null =
      payoutUserId && userIds.has(payoutUserId) ? payoutUserId : null;

    if (committee.turnMethod === 'BIDDING' && bids && Array.isArray(bids) && bids.length) {
      let best: BidInput | null = null;
      for (const b of bids) {
        if (!userIds.has(b.userId)) {
          sendBadRequest(res, 'Bid userId must be a member');
          return;
        }
        if (!best || b.amount > best.amount) best = b;
      }
      resolvedPayout = best!.userId;
    }

    const due = dueDate ? new Date(dueDate) : null;

    const round = await prisma.round.create({
      data: {
        committeeId,
        roundNumber: nextNum,
        payoutUserId: resolvedPayout,
        status: 'ACTIVE',
        dueDate: due,
      },
    });

    const paymentRows = committee.members.map((m) => ({
      roundId: round.id,
      memberId: m.id,
      userId: m.userId,
      amount: m.shareAmount,
      status: 'PENDING' as const,
      dueDate: due,
    }));
    await prisma.payment.createMany({ data: paymentRows });

    const full = await prisma.round.findUnique({
      where: { id: round.id },
      include: {
        payments: { include: { user: { select: { id: true, name: true } } } },
      },
    });

    sendCreated(res, full, 'Round started');
  } catch (err) {
    sendError(res, 'Failed to start round', 500, String(err));
  }
};
