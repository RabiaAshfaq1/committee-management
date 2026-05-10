"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecentActivity = exports.getDashboardStats = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const response_utils_1 = require("../utils/response.utils");
const getDashboardStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        const committeeWhere = role === 'ORGANIZER'
            ? { organizerId: userId }
            : { members: { some: { userId } } };
        const committeeIds = role === 'ORGANIZER'
            ? (await client_1.default.committee.findMany({
                where: { organizerId: userId },
                select: { id: true },
            })).map((c) => c.id)
            : (await client_1.default.committeeMember.findMany({
                where: { userId },
                select: { committeeId: true },
            })).map((m) => m.committeeId);
        const uniqueMemberCount = committeeIds.length === 0
            ? 0
            : (await client_1.default.committeeMember.findMany({
                where: { committeeId: { in: committeeIds } },
                distinct: ['userId'],
                select: { userId: true },
            })).length;
        const [totalCommittees, activeRounds, completedRounds] = await Promise.all([
            client_1.default.committee.count({ where: committeeWhere }),
            client_1.default.round.count({
                where: { status: 'ACTIVE', committee: committeeWhere },
            }),
            client_1.default.round.count({
                where: { status: 'COMPLETED', committee: committeeWhere },
            }),
        ]);
        (0, response_utils_1.sendSuccess)(res, {
            totalCommittees,
            peopleInNetwork: uniqueMemberCount,
            activeRounds,
            completedRounds,
            role,
        }, 'Dashboard stats fetched');
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, 'Failed to fetch stats', 500, String(err));
    }
};
exports.getDashboardStats = getDashboardStats;
const getRecentActivity = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        const committeeWhere = role === 'ORGANIZER'
            ? { organizerId: userId }
            : { members: { some: { userId } } };
        const [recentCommittees, recentRounds] = await Promise.all([
            client_1.default.committee.findMany({
                where: committeeWhere,
                take: 4,
                orderBy: { createdAt: 'desc' },
                select: { id: true, name: true, createdAt: true, status: true },
            }),
            client_1.default.round.findMany({
                where: { committee: committeeWhere },
                take: 6,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    roundNumber: true,
                    status: true,
                    payoutTransactionId: true,
                    createdAt: true,
                    committee: { select: { name: true } },
                },
            }),
        ]);
        const activities = [
            ...recentCommittees.map((c) => ({
                type: 'committee',
                message: `Committee "${c.name}" · ${c.status}`,
                time: c.createdAt,
            })),
            ...recentRounds.map((r) => ({
                type: 'round',
                message: `Round ${r.roundNumber} (${r.status}) · ${r.committee.name}${r.payoutTransactionId ? ' · Tx recorded' : ''}`,
                time: r.createdAt,
            })),
        ]
            .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
            .slice(0, 12);
        (0, response_utils_1.sendSuccess)(res, activities, 'Recent activity fetched');
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, 'Failed to fetch activity', 500, String(err));
    }
};
exports.getRecentActivity = getRecentActivity;
//# sourceMappingURL=dashboard.controller.js.map