import { Response } from 'express';
import prisma from '../prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess, sendError, sendNotFound, sendBadRequest } from '../utils/response.utils';

export const markPaymentPaid = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) { sendNotFound(res, 'Payment not found'); return; }
    if (payment.status === 'PAID') { sendBadRequest(res, 'Payment already marked as paid'); return; }

    const updated = await prisma.payment.update({
      where: { id },
      data: { status: 'PAID', paidAt: new Date(), note: note || null },
      include: {
        user: { select: { id: true, name: true, email: true } },
        round: { select: { roundNumber: true, committeeId: true } },
      },
    });
    sendSuccess(res, updated, 'Payment marked as paid');
  } catch (err) {
    sendError(res, 'Failed to mark payment', 500, String(err));
  }
};

export const getPaymentsByRound = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { roundId } = req.params;
    const payments = await prisma.payment.findMany({
      where: { roundId },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        member: { select: { id: true, turnNumber: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    sendSuccess(res, payments, 'Payments fetched');
  } catch (err) {
    sendError(res, 'Failed to fetch payments', 500, String(err));
  }
};

export const getPaymentsByMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { memberId } = req.params;
    const { status, page = '1', limit = '10' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, unknown> = { userId: memberId };
    if (status) where['status'] = status;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where, skip, take: limitNum,
        include: {
          round: {
            select: { roundNumber: true, dueDate: true, committeeId: true,
              committee: { select: { name: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.payment.count({ where }),
    ]);
    sendSuccess(res, payments, 'Member payments fetched', 200, { total, page: pageNum, limit: limitNum });
  } catch (err) {
    sendError(res, 'Failed to fetch member payments', 500, String(err));
  }
};

export const getOverduePayments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '10' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Also auto-mark pending payments where due date has passed
    await prisma.payment.updateMany({
      where: {
        status: 'PENDING',
        round: { dueDate: { lt: new Date() } },
      },
      data: { status: 'LATE' },
    });

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where: { status: 'LATE' },
        skip, take: limitNum,
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          round: {
            select: { roundNumber: true, dueDate: true,
              committee: { select: { id: true, name: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.payment.count({ where: { status: 'LATE' } }),
    ]);
    sendSuccess(res, payments, 'Overdue payments fetched', 200, { total, page: pageNum, limit: limitNum });
  } catch (err) {
    sendError(res, 'Failed to fetch overdue payments', 500, String(err));
  }
};

export const getAllPayments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, committeeId, page = '1', limit = '10' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, unknown> = {};
    if (status) where['status'] = status;
    if (committeeId) where['round'] = { committeeId };

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where, skip, take: limitNum,
        include: {
          user: { select: { id: true, name: true, email: true } },
          round: {
            select: { roundNumber: true, dueDate: true,
              committee: { select: { id: true, name: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.payment.count({ where }),
    ]);
    sendSuccess(res, payments, 'Payments fetched', 200, { total, page: pageNum, limit: limitNum });
  } catch (err) {
    sendError(res, 'Failed to fetch payments', 500, String(err));
  }
};
