"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.completeRound = exports.getRoundsByCommittee = exports.startRound = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const response_utils_1 = require("../utils/response.utils");
const startRound = async (req, res) => {
    try {
        const { committeeId, dueDate } = req.body;
        if (!committeeId) {
            (0, response_utils_1.sendBadRequest)(res, 'committeeId is required');
            return;
        }
        const committee = await client_1.default.committee.findUnique({
            where: { id: committeeId },
            include: { members: { orderBy: { turnNumber: 'asc' } }, rounds: true },
        });
        if (!committee) {
            (0, response_utils_1.sendNotFound)(res, 'Committee not found');
            return;
        }
        const activeRound = committee.rounds.find(r => r.status === 'ACTIVE');
        if (activeRound) {
            (0, response_utils_1.sendBadRequest)(res, 'There is already an active round for this committee');
            return;
        }
        const nextRoundNumber = committee.rounds.length + 1;
        if (nextRoundNumber > committee.durationMonths) {
            (0, response_utils_1.sendBadRequest)(res, 'All rounds completed for this committee');
            return;
        }
        const payoutMember = committee.members.find(m => m.turnNumber === nextRoundNumber);
        const round = await client_1.default.round.create({
            data: {
                committeeId,
                roundNumber: nextRoundNumber,
                payoutUserId: payoutMember?.userId || null,
                payoutAmount: committee.monthlyAmount * committee.members.length,
                status: 'ACTIVE',
                dueDate: dueDate ? new Date(dueDate) : null,
            },
        });
        // Auto-create payment records for all members
        const payments = committee.members.map(m => ({
            roundId: round.id,
            memberId: m.id,
            userId: m.userId,
            amount: committee.monthlyAmount,
            status: 'PENDING',
        }));
        await client_1.default.payment.createMany({ data: payments });
        const roundWithPayments = await client_1.default.round.findUnique({
            where: { id: round.id },
            include: { payments: { include: { user: { select: { id: true, name: true } } } } },
        });
        (0, response_utils_1.sendCreated)(res, roundWithPayments, 'Round started successfully');
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, 'Failed to start round', 500, String(err));
    }
};
exports.startRound = startRound;
const getRoundsByCommittee = async (req, res) => {
    try {
        const { committeeId } = req.params;
        const rounds = await client_1.default.round.findMany({
            where: { committeeId },
            include: {
                payments: {
                    include: { user: { select: { id: true, name: true, email: true } } },
                },
            },
            orderBy: { roundNumber: 'asc' },
        });
        (0, response_utils_1.sendSuccess)(res, rounds, 'Rounds fetched');
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, 'Failed to fetch rounds', 500, String(err));
    }
};
exports.getRoundsByCommittee = getRoundsByCommittee;
const completeRound = async (req, res) => {
    try {
        const { id } = req.params;
        const round = await client_1.default.round.findUnique({
            where: { id },
            include: { payments: true },
        });
        if (!round) {
            (0, response_utils_1.sendNotFound)(res, 'Round not found');
            return;
        }
        if (round.status === 'COMPLETED') {
            (0, response_utils_1.sendBadRequest)(res, 'Round already completed');
            return;
        }
        // Auto mark unpaid payments as LATE
        const overdueIds = round.payments
            .filter(p => p.status === 'PENDING')
            .map(p => p.id);
        if (overdueIds.length > 0) {
            await client_1.default.payment.updateMany({
                where: { id: { in: overdueIds } },
                data: { status: 'LATE' },
            });
        }
        const updated = await client_1.default.round.update({
            where: { id },
            data: { status: 'COMPLETED' },
        });
        (0, response_utils_1.sendSuccess)(res, updated, 'Round completed');
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, 'Failed to complete round', 500, String(err));
    }
};
exports.completeRound = completeRound;
//# sourceMappingURL=round.controller.js.map