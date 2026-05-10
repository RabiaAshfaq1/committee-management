"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignTurns = exports.removeMember = exports.addMember = exports.deleteCommittee = exports.updateCommittee = exports.getCommitteeById = exports.getAllCommittees = exports.createCommittee = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const response_utils_1 = require("../utils/response.utils");
const createCommittee = async (req, res) => {
    try {
        const { name, description, totalMembers, monthlyAmount, startDate, durationMonths, turnAssignment, } = req.body;
        if (!name || !totalMembers || !monthlyAmount || !startDate || !durationMonths) {
            (0, response_utils_1.sendBadRequest)(res, 'Missing required fields');
            return;
        }
        const committee = await client_1.default.committee.create({
            data: {
                name,
                description,
                totalMembers: Number(totalMembers),
                monthlyAmount: Number(monthlyAmount),
                startDate: new Date(startDate),
                durationMonths: Number(durationMonths),
                turnAssignment: turnAssignment || 'RANDOM',
                organizerId: req.user.id,
            },
            include: {
                organizer: { select: { id: true, name: true, email: true } },
                _count: { select: { members: true, rounds: true } },
            },
        });
        (0, response_utils_1.sendCreated)(res, committee, 'Committee created successfully');
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, 'Failed to create committee', 500, String(err));
    }
};
exports.createCommittee = createCommittee;
const getAllCommittees = async (req, res) => {
    try {
        const { status, search, page = '1', limit = '10' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const where = {};
        if (status)
            where['status'] = status;
        if (search)
            where['name'] = { contains: search, mode: 'insensitive' };
        if (req.user?.role === 'MEMBER') {
            where['members'] = { some: { userId: req.user.id } };
        }
        else if (req.user?.role === 'ORGANIZER') {
            where['organizerId'] = req.user.id;
        }
        const [committees, total] = await Promise.all([
            client_1.default.committee.findMany({
                where,
                skip,
                take: limitNum,
                include: {
                    organizer: { select: { id: true, name: true, email: true } },
                    _count: { select: { members: true, rounds: true } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            client_1.default.committee.count({ where }),
        ]);
        (0, response_utils_1.sendSuccess)(res, committees, 'Committees fetched', 200, {
            total,
            page: pageNum,
            limit: limitNum,
        });
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, 'Failed to fetch committees', 500, String(err));
    }
};
exports.getAllCommittees = getAllCommittees;
const getCommitteeById = async (req, res) => {
    try {
        const { id } = req.params;
        const committee = await client_1.default.committee.findUnique({
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
                        _count: { select: { contributionSplits: true } },
                    },
                },
            },
        });
        if (!committee) {
            (0, response_utils_1.sendNotFound)(res, 'Committee not found');
            return;
        }
        const user = req.user;
        if (user?.role === 'MEMBER') {
            const allowed = committee.members.some((m) => m.userId === user.id);
            if (!allowed) {
                (0, response_utils_1.sendForbidden)(res, 'You are not part of this committee');
                return;
            }
        }
        else if (user?.role === 'ORGANIZER' && committee.organizerId !== user.id) {
            (0, response_utils_1.sendForbidden)(res, 'You can only open committees you organize');
            return;
        }
        (0, response_utils_1.sendSuccess)(res, committee, 'Committee fetched');
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, 'Failed to fetch committee', 500, String(err));
    }
};
exports.getCommitteeById = getCommitteeById;
const updateCommittee = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, status, monthlyAmount, durationMonths } = req.body;
        const committee = await client_1.default.committee.findUnique({ where: { id } });
        if (!committee) {
            (0, response_utils_1.sendNotFound)(res, 'Committee not found');
            return;
        }
        if (req.user?.role === 'ORGANIZER' && committee.organizerId !== req.user.id) {
            (0, response_utils_1.sendForbidden)(res, 'You can only update your own committees');
            return;
        }
        const updated = await client_1.default.committee.update({
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
        (0, response_utils_1.sendSuccess)(res, updated, 'Committee updated');
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, 'Failed to update committee', 500, String(err));
    }
};
exports.updateCommittee = updateCommittee;
const deleteCommittee = async (req, res) => {
    try {
        const { id } = req.params;
        const committee = await client_1.default.committee.findUnique({ where: { id } });
        if (!committee) {
            (0, response_utils_1.sendNotFound)(res, 'Committee not found');
            return;
        }
        if (req.user?.role === 'ORGANIZER' && committee.organizerId !== req.user.id) {
            (0, response_utils_1.sendForbidden)(res);
            return;
        }
        await client_1.default.round.deleteMany({ where: { committeeId: id } });
        await client_1.default.committeeMember.deleteMany({ where: { committeeId: id } });
        await client_1.default.committee.delete({ where: { id } });
        (0, response_utils_1.sendSuccess)(res, null, 'Committee deleted');
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, 'Failed to delete committee', 500, String(err));
    }
};
exports.deleteCommittee = deleteCommittee;
const addMember = async (req, res) => {
    try {
        const { id: committeeId } = req.params;
        const { userId, turnNumber } = req.body;
        const committee = await client_1.default.committee.findUnique({
            where: { id: committeeId },
            include: { members: true },
        });
        if (!committee) {
            (0, response_utils_1.sendNotFound)(res, 'Committee not found');
            return;
        }
        if (req.user.role === 'ORGANIZER' &&
            committee.organizerId !== req.user.id) {
            (0, response_utils_1.sendForbidden)(res, 'You can only add members to your own committees');
            return;
        }
        if (committee.members.length >= committee.totalMembers) {
            (0, response_utils_1.sendBadRequest)(res, 'Committee is full');
            return;
        }
        if (!userId || turnNumber === undefined || turnNumber === null) {
            (0, response_utils_1.sendBadRequest)(res, 'userId and turnNumber are required');
            return;
        }
        const alreadyMember = committee.members.find((m) => m.userId === userId);
        if (alreadyMember) {
            (0, response_utils_1.sendBadRequest)(res, 'User is already a member of this committee');
            return;
        }
        const existingTurn = committee.members.find((m) => m.turnNumber === Number(turnNumber));
        if (existingTurn) {
            (0, response_utils_1.sendBadRequest)(res, `Turn number ${turnNumber} is already taken`);
            return;
        }
        const member = await client_1.default.committeeMember.create({
            data: {
                userId,
                committeeId,
                turnNumber: Number(turnNumber),
            },
            include: {
                user: { select: { id: true, name: true, email: true, phone: true } },
            },
        });
        (0, response_utils_1.sendCreated)(res, member, 'Member added to committee');
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, 'Failed to add member', 500, String(err));
    }
};
exports.addMember = addMember;
const removeMember = async (req, res) => {
    try {
        const { id: committeeId, memberId } = req.params;
        const member = await client_1.default.committeeMember.findFirst({
            where: { id: memberId, committeeId },
            include: { committee: { select: { organizerId: true } } },
        });
        if (!member) {
            (0, response_utils_1.sendNotFound)(res, 'Member not found on this committee');
            return;
        }
        if (req.user.role === 'ORGANIZER' &&
            member.committee.organizerId !== req.user.id) {
            (0, response_utils_1.sendForbidden)(res, 'You can only remove members from your own committees');
            return;
        }
        await client_1.default.committeeMember.delete({ where: { id: memberId } });
        (0, response_utils_1.sendSuccess)(res, null, 'Member removed from committee');
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, 'Failed to remove member', 500, String(err));
    }
};
exports.removeMember = removeMember;
const assignTurns = async (req, res) => {
    try {
        const { id: committeeId } = req.params;
        const { assignments } = req.body;
        // assignments: [{ memberId, turnNumber }]
        const committee = await client_1.default.committee.findUnique({
            where: { id: committeeId },
            include: { members: true },
        });
        if (!committee) {
            (0, response_utils_1.sendNotFound)(res, 'Committee not found');
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
            const updates = members.map((m, idx) => client_1.default.committeeMember.update({
                where: { id: m.id },
                data: { turnNumber: turns[idx] },
            }));
            await Promise.all(updates);
        }
        else if (assignments && Array.isArray(assignments)) {
            // Manual/Bidding assignment
            const updates = assignments.map((a) => client_1.default.committeeMember.update({
                where: { id: a.memberId },
                data: { turnNumber: a.turnNumber },
            }));
            await Promise.all(updates);
        }
        const updatedMembers = await client_1.default.committeeMember.findMany({
            where: { committeeId },
            include: { user: { select: { id: true, name: true, email: true } } },
            orderBy: { turnNumber: 'asc' },
        });
        (0, response_utils_1.sendSuccess)(res, updatedMembers, 'Turns assigned successfully');
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, 'Failed to assign turns', 500, String(err));
    }
};
exports.assignTurns = assignTurns;
//# sourceMappingURL=committee.controller.js.map