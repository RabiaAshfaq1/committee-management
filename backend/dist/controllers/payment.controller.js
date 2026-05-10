"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllPayments = exports.getOverduePayments = exports.getPaymentsByMember = exports.getPaymentsByRound = exports.markPaymentPaid = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const response_utils_1 = require("../utils/response.utils");
const markPaymentPaid = async (req, res) => {
    try {
        const { id } = req.params;
        const { note } = req.body;
        const payment = await client_1.default.payment.findUnique({ where: { id } });
        if (!payment) {
            (0, response_utils_1.sendNotFound)(res, 'Payment not found');
            return;
        }
        if (payment.status === 'PAID') {
            (0, response_utils_1.sendBadRequest)(res, 'Payment already marked as paid');
            return;
        }
        const updated = await client_1.default.payment.update({
            where: { id },
            data: { status: 'PAID', paidAt: new Date(), note: note || null },
            include: {
                user: { select: { id: true, name: true, email: true } },
                round: { select: { roundNumber: true, committeeId: true } },
            },
        });
        (0, response_utils_1.sendSuccess)(res, updated, 'Payment marked as paid');
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, 'Failed to mark payment', 500, String(err));
    }
};
exports.markPaymentPaid = markPaymentPaid;
const getPaymentsByRound = async (req, res) => {
    try {
        const { roundId } = req.params;
        const payments = await client_1.default.payment.findMany({
            where: { roundId },
            include: {
                user: { select: { id: true, name: true, email: true, phone: true } },
                member: { select: { id: true, turnNumber: true } },
            },
            orderBy: { createdAt: 'asc' },
        });
        (0, response_utils_1.sendSuccess)(res, payments, 'Payments fetched');
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, 'Failed to fetch payments', 500, String(err));
    }
};
exports.getPaymentsByRound = getPaymentsByRound;
const getPaymentsByMember = async (req, res) => {
    try {
        const { memberId } = req.params;
        const { status, page = '1', limit = '10' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const where = { userId: memberId };
        if (status)
            where['status'] = status;
        const [payments, total] = await Promise.all([
            client_1.default.payment.findMany({
                where, skip, take: limitNum,
                include: {
                    round: {
                        select: { roundNumber: true, dueDate: true, committeeId: true,
                            committee: { select: { name: true } } },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            client_1.default.payment.count({ where }),
        ]);
        (0, response_utils_1.sendSuccess)(res, payments, 'Member payments fetched', 200, { total, page: pageNum, limit: limitNum });
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, 'Failed to fetch member payments', 500, String(err));
    }
};
exports.getPaymentsByMember = getPaymentsByMember;
const getOverduePayments = async (req, res) => {
    try {
        const { page = '1', limit = '10' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        // Also auto-mark pending payments where due date has passed
        await client_1.default.payment.updateMany({
            where: {
                status: 'PENDING',
                round: { dueDate: { lt: new Date() } },
            },
            data: { status: 'LATE' },
        });
        const [payments, total] = await Promise.all([
            client_1.default.payment.findMany({
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
            client_1.default.payment.count({ where: { status: 'LATE' } }),
        ]);
        (0, response_utils_1.sendSuccess)(res, payments, 'Overdue payments fetched', 200, { total, page: pageNum, limit: limitNum });
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, 'Failed to fetch overdue payments', 500, String(err));
    }
};
exports.getOverduePayments = getOverduePayments;
const getAllPayments = async (req, res) => {
    try {
        const { status, committeeId, page = '1', limit = '10' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const where = {};
        if (status)
            where['status'] = status;
        if (committeeId)
            where['round'] = { committeeId };
        const [payments, total] = await Promise.all([
            client_1.default.payment.findMany({
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
            client_1.default.payment.count({ where }),
        ]);
        (0, response_utils_1.sendSuccess)(res, payments, 'Payments fetched', 200, { total, page: pageNum, limit: limitNum });
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, 'Failed to fetch payments', 500, String(err));
    }
};
exports.getAllPayments = getAllPayments;
//# sourceMappingURL=payment.controller.js.map