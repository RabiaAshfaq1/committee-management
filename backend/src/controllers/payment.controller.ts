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
    const isAdmin = payment.round.committee.adminId === req.user!.id;
    if (!isOwner && !isAdmin) {
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
    if (payment.round.committee.adminId !== req.user!.id) {
      sendForbidden(res, 'Only admin can confirm');
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
    const isAdmin = round.committee.adminId === req.user!.id;
    if (!isMember && !isAdmin) {
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
