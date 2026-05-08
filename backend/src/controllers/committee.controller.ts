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

export const createCommittee = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      name,
      description,
      totalMembers,
      monthlyAmount,
      startDate,
      durationMonths,
      turnAssignment,
    } = req.body;

    if (!name || !totalMembers || !monthlyAmount || !startDate || !durationMonths) {
      sendBadRequest(res, 'Missing required fields');
      return;
    }

    const committee = await prisma.committee.create({
      data: {
        name,
        description,
        totalMembers: Number(totalMembers),
        monthlyAmount: Number(monthlyAmount),
        startDate: new Date(startDate),
        durationMonths: Number(durationMonths),
        turnAssignment: turnAssignment || 'RANDOM',
        organizerId: req.user!.id,
      },
      include: {
        organizer: { select: { id: true, name: true, email: true } },
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

    // Members see only their committees
    if (req.user?.role === 'MEMBER') {
      where['members'] = { some: { userId: req.user.id } };
    } else if (req.user?.role === 'ORGANIZER') {
      where['organizerId'] = req.user.id;
    }

    const [committees, total] = await Promise.all([
      prisma.committee.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          organizer: { select: { id: true, name: true, email: true } },
          _count: { select: { members: true, rounds: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.committee.count({ where }),
    ]);

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
        organizer: { select: { id: true, name: true, email: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true, cnic: true, avatar: true } },
          },
          orderBy: { turnNumber: 'asc' },
        },
        rounds: {
          orderBy: { roundNumber: 'asc' },
          include: {
            _count: { select: { payments: true } },
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
    const { name, description, status, monthlyAmount, durationMonths } = req.body;

    const committee = await prisma.committee.findUnique({ where: { id } });
    if (!committee) {
      sendNotFound(res, 'Committee not found');
      return;
    }

    if (req.user?.role === 'ORGANIZER' && committee.organizerId !== req.user.id) {
      sendForbidden(res, 'You can only update your own committees');
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
      },
      include: {
        organizer: { select: { id: true, name: true, email: true } },
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

    if (req.user?.role === 'ORGANIZER' && committee.organizerId !== req.user.id) {
      sendForbidden(res);
      return;
    }

    // Delete related data in order
    await prisma.payment.deleteMany({ where: { round: { committeeId: id } } });
    await prisma.round.deleteMany({ where: { committeeId: id } });
    await prisma.committeeMember.deleteMany({ where: { committeeId: id } });
    await prisma.committee.delete({ where: { id } });

    sendSuccess(res, null, 'Committee deleted');
  } catch (err) {
    sendError(res, 'Failed to delete committee', 500, String(err));
  }
};

export const addMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id: committeeId } = req.params;
    const { userId, turnNumber } = req.body;

    const committee = await prisma.committee.findUnique({
      where: { id: committeeId },
      include: { members: true },
    });
    if (!committee) {
      sendNotFound(res, 'Committee not found');
      return;
    }

    if (committee.members.length >= committee.totalMembers) {
      sendBadRequest(res, 'Committee is full');
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

    const member = await prisma.committeeMember.create({
      data: {
        userId,
        committeeId,
        turnNumber: Number(turnNumber),
      },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    });

    sendCreated(res, member, 'Member added to committee');
  } catch (err) {
    sendError(res, 'Failed to add member', 500, String(err));
  }
};

export const removeMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { memberId } = req.params;
    const member = await prisma.committeeMember.findUnique({ where: { id: memberId } });
    if (!member) {
      sendNotFound(res, 'Member not found');
      return;
    }

    await prisma.committeeMember.delete({ where: { id: memberId } });
    sendSuccess(res, null, 'Member removed from committee');
  } catch (err) {
    sendError(res, 'Failed to remove member', 500, String(err));
  }
};

export const assignTurns = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id: committeeId } = req.params;
    const { assignments } = req.body;
    // assignments: [{ memberId, turnNumber }]

    const committee = await prisma.committee.findUnique({
      where: { id: committeeId },
      include: { members: true },
    });
    if (!committee) {
      sendNotFound(res, 'Committee not found');
      return;
    }

    if (committee.turnAssignment === 'RANDOM') {
      // Auto-assign random turns
      const members = committee.members;
      const turns = Array.from({ length: members.length }, (_, i) => i + 1);
      for (let i = turns.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [turns[i], turns[j]] = [turns[j], turns[i]];
      }

      const updates = members.map((m, idx) =>
        prisma.committeeMember.update({
          where: { id: m.id },
          data: { turnNumber: turns[idx] },
        })
      );
      await Promise.all(updates);
    } else if (assignments && Array.isArray(assignments)) {
      // Manual/Bidding assignment
      const updates = (assignments as { memberId: string; turnNumber: number }[]).map((a) =>
        prisma.committeeMember.update({
          where: { id: a.memberId },
          data: { turnNumber: a.turnNumber },
        })
      );
      await Promise.all(updates);
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
