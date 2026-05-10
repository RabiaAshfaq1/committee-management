import { Response } from 'express';
import prisma from '../prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  sendSuccess, sendCreated, sendError, sendNotFound, sendBadRequest, sendForbidden,
} from '../utils/response.utils';
import bcrypt from 'bcryptjs';

export const getAllMembers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search, status, page = '1', limit = '10' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    const where: Record<string, unknown> = { role: 'MEMBER' };
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
        where, skip, take: limitNum,
        select: {
          id: true, name: true, email: true, phone: true, cnic: true,
          role: true, avatar: true, isActive: true, createdAt: true,
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
        id: true, name: true, email: true, phone: true, cnic: true,
        role: true, avatar: true, isActive: true, createdAt: true,
        committees: {
          include: {
            committee: {
              select: {
                id: true,
                name: true,
                status: true,
                monthlyAmount: true,
                organizer: { select: { id: true, name: true, email: true } },
              },
            },
          },
        },
      },
    });
    if (!member) { sendNotFound(res, 'Member not found'); return; }
    if (
      req.user?.role === 'MEMBER' &&
      req.user.id !== id
    ) {
      sendForbidden(res, 'You can only view your own profile');
      return;
    }
    sendSuccess(res, member);
  } catch (err) {
    sendError(res, 'Failed to fetch member', 500, String(err));
  }
};

export const createMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, email, phone, cnic, password } = req.body;
    if (!name || !email || !password) { sendBadRequest(res, 'Name, email and password are required'); return; }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) { sendBadRequest(res, 'Email already exists'); return; }
    const hashed = await bcrypt.hash(password, 12);
    const member = await prisma.user.create({
      data: { name, email, phone, cnic, password: hashed, role: 'MEMBER' },
      select: { id: true, name: true, email: true, phone: true, cnic: true, role: true, isActive: true, createdAt: true },
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
    if (!member) { sendNotFound(res, 'Member not found'); return; }
    const updated = await prisma.user.update({
      where: { id },
      data: {
        name: name ?? member.name,
        phone: phone ?? member.phone,
        cnic: cnic ?? member.cnic,
        isActive: isActive !== undefined ? isActive : member.isActive,
      },
      select: { id: true, name: true, email: true, phone: true, cnic: true, role: true, isActive: true, createdAt: true },
    });
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

/** Participation summary: committees joined, payout rounds as recipient, transaction IDs on record */
export const getMemberCommitteeHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (req.user?.role === 'MEMBER' && req.user.id !== id) {
      sendForbidden(res, 'You can only view your own history');
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, role: true },
    });
    if (!user || user.role !== 'MEMBER') {
      sendNotFound(res, 'Member not found');
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
            organizer: { select: { id: true, name: true, email: true } },
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
        payoutAmount: true,
        payoutTransactionId: true,
        dueDate: true,
        createdAt: true,
        committee: { select: { id: true, name: true } },
      },
    });

    const summary = {
      committeesJoined: memberships.length,
      timesReceivedPayout: payoutRounds.filter((r) => r.status === 'COMPLETED').length,
      transactionIdsRecorded: payoutRounds.filter((r) => !!r.payoutTransactionId).length,
    };

    sendSuccess(res, { memberships, payoutRounds, summary }, 'History fetched');
  } catch (err) {
    sendError(res, 'Failed to fetch history', 500, String(err));
  }
};
