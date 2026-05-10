"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.completeRound = exports.submitPayoutTransaction = exports.getRoundsByCommittee = exports.startRound = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const response_utils_1 = require("../utils/response.utils");
function pickRandomMemberUserId(members) {
    if (!members.length)
        return null;
    const i = Math.floor(Math.random() * members.length);
    return members[i].userId;
}
const startRound = async (req, res) => {
    try {
        const { committeeId, dueDate, payoutUserId, bids, contributionSplits } = req.body;
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
        if (committee.organizerId !== req.user.id) {
            (0, response_utils_1.sendForbidden)(res, 'You can only start rounds on your own committees');
            return;
        }
        const activeRound = committee.rounds.find((r) => r.status === 'ACTIVE');
        if (activeRound) {
            (0, response_utils_1.sendBadRequest)(res, 'There is already an active round for this committee');
            return;
        }
        const nextRoundNumber = committee.rounds.length + 1;
        if (nextRoundNumber > committee.durationMonths) {
            (0, response_utils_1.sendBadRequest)(res, 'All rounds completed for this committee');
            return;
        }
        const memberIds = new Set(committee.members.map((m) => m.id));
        const userIds = new Set(committee.members.map((m) => m.userId));
        let resolvedPayoutUserId = null;
        if (committee.turnAssignment === 'MANUAL') {
            if (!payoutUserId || !userIds.has(payoutUserId)) {
                (0, response_utils_1.sendBadRequest)(res, 'payoutUserId is required and must be a committee member');
                return;
            }
            resolvedPayoutUserId = payoutUserId;
        }
        else if (committee.turnAssignment === 'BIDDING') {
            if (bids && Array.isArray(bids) && bids.length > 0) {
                let best = null;
                for (const b of bids) {
                    if (!userIds.has(b.userId)) {
                        (0, response_utils_1.sendBadRequest)(res, 'Bid userId must be a committee member');
                        return;
                    }
                    if (!best || b.amount > best.amount)
                        best = b;
                }
                resolvedPayoutUserId = best.userId;
            }
            else if (payoutUserId && userIds.has(payoutUserId)) {
                resolvedPayoutUserId = payoutUserId;
            }
            else {
                (0, response_utils_1.sendBadRequest)(res, 'Provide bids[] or payoutUserId for this round');
                return;
            }
        }
        else {
            resolvedPayoutUserId = pickRandomMemberUserId(committee.members);
        }
        if (!resolvedPayoutUserId) {
            (0, response_utils_1.sendBadRequest)(res, 'Could not determine payout recipient');
            return;
        }
        const pool = committee.monthlyAmount;
        let splits;
        if (contributionSplits && contributionSplits.length > 0) {
            let sum = 0;
            splits = [];
            for (const s of contributionSplits) {
                if (!memberIds.has(s.memberId)) {
                    (0, response_utils_1.sendBadRequest)(res, 'Invalid memberId in contributionSplits');
                    return;
                }
                const amt = Number(s.amount);
                if (amt <= 0) {
                    (0, response_utils_1.sendBadRequest)(res, 'Split amounts must be positive');
                    return;
                }
                sum += amt;
                splits.push({ memberId: s.memberId, amount: amt });
            }
            if (Math.abs(sum - pool) > 0.01) {
                (0, response_utils_1.sendBadRequest)(res, `Contribution splits must sum to monthly pool (${pool})`);
                return;
            }
        }
        else {
            const n = committee.members.length;
            if (n === 0) {
                (0, response_utils_1.sendBadRequest)(res, 'Committee has no members');
                return;
            }
            const each = pool / n;
            splits = committee.members.map((m) => ({ memberId: m.id, amount: each }));
        }
        const round = await client_1.default.round.create({
            data: {
                committeeId,
                roundNumber: nextRoundNumber,
                payoutUserId: resolvedPayoutUserId,
                payoutAmount: pool,
                status: 'ACTIVE',
                dueDate: dueDate ? new Date(dueDate) : null,
                contributionSplits: {
                    create: splits.map((s) => ({ memberId: s.memberId, amount: s.amount })),
                },
            },
            include: {
                contributionSplits: {
                    include: {
                        member: {
                            include: { user: { select: { id: true, name: true, email: true } } },
                        },
                    },
                },
            },
        });
        (0, response_utils_1.sendCreated)(res, round, 'Round started');
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, 'Failed to start round', 500, String(err));
    }
};
exports.startRound = startRound;
const getRoundsByCommittee = async (req, res) => {
    try {
        if (!req.user) {
            (0, response_utils_1.sendUnauthorized)(res, 'Unauthorized');
            return;
        }
        const { committeeId } = req.params;
        const committee = await client_1.default.committee.findUnique({
            where: { id: committeeId },
            include: { members: { select: { userId: true } } },
        });
        if (!committee) {
            (0, response_utils_1.sendNotFound)(res, 'Committee not found');
            return;
        }
        if (req.user.role === 'MEMBER') {
            const isIn = committee.members.some((m) => m.userId === req.user.id);
            if (!isIn) {
                (0, response_utils_1.sendForbidden)(res, 'Access denied');
                return;
            }
        }
        else if (req.user.role === 'ORGANIZER' && committee.organizerId !== req.user.id) {
            (0, response_utils_1.sendForbidden)(res, 'Access denied');
            return;
        }
        const rounds = await client_1.default.round.findMany({
            where: { committeeId },
            include: {
                contributionSplits: {
                    include: {
                        member: {
                            include: { user: { select: { id: true, name: true, email: true } } },
                        },
                    },
                },
                committee: {
                    select: {
                        name: true,
                        monthlyAmount: true,
                        durationMonths: true,
                        totalMembers: true,
                        organizerId: true,
                        turnAssignment: true,
                        members: {
                            select: {
                                id: true,
                                turnNumber: true,
                                userId: true,
                                user: { select: { id: true, name: true, email: true } },
                            },
                            orderBy: { turnNumber: 'asc' },
                        },
                    },
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
const submitPayoutTransaction = async (req, res) => {
    try {
        if (!req.user) {
            (0, response_utils_1.sendUnauthorized)(res, 'Unauthorized');
            return;
        }
        const { roundId } = req.params;
        const { transactionId } = req.body;
        if (!transactionId || !String(transactionId).trim()) {
            (0, response_utils_1.sendBadRequest)(res, 'transactionId is required');
            return;
        }
        const round = await client_1.default.round.findUnique({
            where: { id: roundId },
            include: { committee: { select: { organizerId: true } } },
        });
        if (!round) {
            (0, response_utils_1.sendNotFound)(res, 'Round not found');
            return;
        }
        if (round.status !== 'ACTIVE') {
            (0, response_utils_1.sendBadRequest)(res, 'Only an active round accepts a transaction id');
            return;
        }
        const isRecipient = round.payoutUserId === req.user.id;
        const isOrganizer = round.committee.organizerId === req.user.id;
        if (!isRecipient && !isOrganizer) {
            (0, response_utils_1.sendForbidden)(res, 'Only the recipient or organizer can submit the transaction id');
            return;
        }
        const updated = await client_1.default.round.update({
            where: { id: roundId },
            data: { payoutTransactionId: String(transactionId).trim() },
        });
        (0, response_utils_1.sendSuccess)(res, updated, 'Transaction id saved');
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, 'Failed to save transaction id', 500, String(err));
    }
};
exports.submitPayoutTransaction = submitPayoutTransaction;
const completeRound = async (req, res) => {
    try {
        if (!req.user) {
            (0, response_utils_1.sendUnauthorized)(res, 'Unauthorized');
            return;
        }
        const { id } = req.params;
        const round = await client_1.default.round.findUnique({
            where: { id },
            include: { committee: { select: { organizerId: true } } },
        });
        if (!round) {
            (0, response_utils_1.sendNotFound)(res, 'Round not found');
            return;
        }
        if (round.committee.organizerId !== req.user.id) {
            (0, response_utils_1.sendForbidden)(res, 'Access denied');
            return;
        }
        if (round.status === 'COMPLETED') {
            (0, response_utils_1.sendBadRequest)(res, 'Round already completed');
            return;
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