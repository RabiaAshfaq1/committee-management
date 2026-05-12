import { Response } from 'express';
import prisma from '../prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  sendSuccess,
  sendError,
  sendNotFound,
  sendBadRequest,
  sendForbidden,
} from '../utils/response.utils';
import { evaluateBadges } from '../utils/badge.engine';
import { canManageCommittee } from '../utils/committee.access';

export const submitTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { transactionId } = req.body as { transactionId?: string };
    if (!transactionId?.trim()) {
      sendBadRequest(res, 'transactionId is required');
      return;
    }

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        round: { include: { committee: { select: { adminId: true } } } },
      },
    });
    if (!payment) {
      sendNotFound(res, 'Payment not found');
      return;
    }

    const isOwner = payment.userId === req.user!.id;
    const canManage = canManageCommittee(req.user!.id, req.user!.role, payment.round.committee.adminId);
    if (!isOwner && !canManage) {
      sendForbidden(res, 'Not allowed');
      return;
    }

    const updated = await prisma.payment.update({
      where: { id },
      data: { transactionId: transactionId.trim() },
    });
    sendSuccess(res, updated, 'Transaction ID submitted');
  } catch (err) {
    sendError(res, 'Failed to submit', 500, String(err));
  }
};

export const confirmPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        round: { include: { committee: { select: { adminId: true } } } },
      },
    });
    if (!payment) {
      sendNotFound(res, 'Payment not found');
      return;
    }
    if (!canManageCommittee(req.user!.id, req.user!.role, payment.round.committee.adminId)) {
      sendForbidden(res, 'Only the organizer or a platform moderator can confirm payments');
      return;
    }
    if (!payment.transactionId) {
      sendBadRequest(res, 'Member must submit a transaction ID first');
      return;
    }

    const updated = await prisma.payment.update({
      where: { id },
      data: { status: 'PAID', paidAt: new Date() },
    });
    await evaluateBadges(payment.userId);

    const roundPayments = await prisma.payment.findMany({ where: { roundId: payment.roundId } });
    if (roundPayments.length > 0 && roundPayments.every((p) => p.status === 'PAID')) {
      await prisma.round.update({ where: { id: payment.roundId }, data: { status: 'COMPLETED' } });
      for (const p of roundPayments) {
        await evaluateBadges(p.userId);
      }
    }

    sendSuccess(res, updated, 'Payment confirmed');
  } catch (err) {
    sendError(res, 'Failed to confirm', 500, String(err));
  }
};

export const getPaymentsByRound = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { roundId } = req.params;
    const round = await prisma.round.findUnique({
      where: { id: roundId },
      include: {
        committee: {
          select: {
            adminId: true,
            members: { select: { userId: true } },
          },
        },
      },
    });
    if (!round) {
      sendNotFound(res, 'Round not found');
      return;
    }

    const isMember = round.committee.members.some((m) => m.userId === req.user!.id);
    const canManage = canManageCommittee(req.user!.id, req.user!.role, round.committee.adminId);
    if (!isMember && !canManage) {
      sendForbidden(res, 'Access denied');
      return;
    }

    const payments = await prisma.payment.findMany({
      where: { roundId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    sendSuccess(res, payments, 'Payments fetched');
  } catch (err) {
    sendError(res, 'Failed to fetch payments', 500, String(err));
  }
};
