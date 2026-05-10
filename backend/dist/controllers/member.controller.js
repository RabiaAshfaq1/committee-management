"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMemberCommitteeHistory = exports.deactivateMember = exports.updateMember = exports.createMember = exports.getMemberById = exports.getAllMembers = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const response_utils_1 = require("../utils/response.utils");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const getAllMembers = async (req, res) => {
    try {
        const { search, status, page = '1', limit = '10' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const where = { role: 'MEMBER' };
        if (status === 'active')
            where['isActive'] = true;
        if (status === 'inactive')
            where['isActive'] = false;
        if (search) {
            where['OR'] = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { cnic: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
            ];
        }
        const [members, total] = await Promise.all([
            client_1.default.user.findMany({
                where, skip, take: limitNum,
                select: {
                    id: true, name: true, email: true, phone: true, cnic: true,
                    role: true, avatar: true, isActive: true, createdAt: true,
                    _count: { select: { committees: true } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            client_1.default.user.count({ where }),
        ]);
        (0, response_utils_1.sendSuccess)(res, members, 'Members fetched', 200, { total, page: pageNum, limit: limitNum });
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, 'Failed to fetch members', 500, String(err));
    }
};
exports.getAllMembers = getAllMembers;
const getMemberById = async (req, res) => {
    try {
        const { id } = req.params;
        const member = await client_1.default.user.findUnique({
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
        if (!member) {
            (0, response_utils_1.sendNotFound)(res, 'Member not found');
            return;
        }
        if (req.user?.role === 'MEMBER' &&
            req.user.id !== id) {
            (0, response_utils_1.sendForbidden)(res, 'You can only view your own profile');
            return;
        }
        (0, response_utils_1.sendSuccess)(res, member);
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, 'Failed to fetch member', 500, String(err));
    }
};
exports.getMemberById = getMemberById;
const createMember = async (req, res) => {
    try {
        const { name, email, phone, cnic, password } = req.body;
        if (!name || !email || !password) {
            (0, response_utils_1.sendBadRequest)(res, 'Name, email and password are required');
            return;
        }
        const existing = await client_1.default.user.findUnique({ where: { email } });
        if (existing) {
            (0, response_utils_1.sendBadRequest)(res, 'Email already exists');
            return;
        }
        const hashed = await bcryptjs_1.default.hash(password, 12);
        const member = await client_1.default.user.create({
            data: { name, email, phone, cnic, password: hashed, role: 'MEMBER' },
            select: { id: true, name: true, email: true, phone: true, cnic: true, role: true, isActive: true, createdAt: true },
        });
        (0, response_utils_1.sendCreated)(res, member, 'Member created');
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, 'Failed to create member', 500, String(err));
    }
};
exports.createMember = createMember;
const updateMember = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone, cnic, isActive } = req.body;
        const member = await client_1.default.user.findUnique({ where: { id } });
        if (!member) {
            (0, response_utils_1.sendNotFound)(res, 'Member not found');
            return;
        }
        const updated = await client_1.default.user.update({
            where: { id },
            data: {
                name: name ?? member.name,
                phone: phone ?? member.phone,
                cnic: cnic ?? member.cnic,
                isActive: isActive !== undefined ? isActive : member.isActive,
            },
            select: { id: true, name: true, email: true, phone: true, cnic: true, role: true, isActive: true, createdAt: true },
        });
        (0, response_utils_1.sendSuccess)(res, updated, 'Member updated');
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, 'Failed to update member', 500, String(err));
    }
};
exports.updateMember = updateMember;
const deactivateMember = async (req, res) => {
    try {
        const { id } = req.params;
        await client_1.default.user.update({ where: { id }, data: { isActive: false } });
        (0, response_utils_1.sendSuccess)(res, null, 'Member deactivated');
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, 'Failed to deactivate member', 500, String(err));
    }
};
exports.deactivateMember = deactivateMember;
/** Participation summary: committees joined, payout rounds as recipient, transaction IDs on record */
const getMemberCommitteeHistory = async (req, res) => {
    try {
        const { id } = req.params;
        if (req.user?.role === 'MEMBER' && req.user.id !== id) {
            (0, response_utils_1.sendForbidden)(res, 'You can only view your own history');
            return;
        }
        const user = await client_1.default.user.findUnique({
            where: { id },
            select: { id: true, name: true, role: true },
        });
        if (!user || user.role !== 'MEMBER') {
            (0, response_utils_1.sendNotFound)(res, 'Member not found');
            return;
        }
        const memberships = await client_1.default.committeeMember.findMany({
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
        const payoutRounds = await client_1.default.round.findMany({
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
        (0, response_utils_1.sendSuccess)(res, { memberships, payoutRounds, summary }, 'History fetched');
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, 'Failed to fetch history', 500, String(err));
    }
};
exports.getMemberCommitteeHistory = getMemberCommitteeHistory;
//# sourceMappingURL=member.controller.js.map