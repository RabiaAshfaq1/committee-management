"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const client_1 = __importDefault(require("../prisma/client"));
const jwt_utils_1 = require("../utils/jwt.utils");
const response_utils_1 = require("../utils/response.utils");
const register = async (req, res) => {
    try {
        const { name, email, phone, cnic, password, role } = req.body;
        if (!name || !email || !password) {
            (0, response_utils_1.sendBadRequest)(res, 'Name, email and password are required');
            return;
        }
        const existing = await client_1.default.user.findUnique({ where: { email } });
        if (existing) {
            (0, response_utils_1.sendBadRequest)(res, 'Email already registered');
            return;
        }
        if (cnic) {
            const existingCnic = await client_1.default.user.findUnique({ where: { cnic } });
            if (existingCnic) {
                (0, response_utils_1.sendBadRequest)(res, 'CNIC already registered');
                return;
            }
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 12);
        const allowedRoles = ['ORGANIZER', 'MEMBER'];
        const userRole = role && allowedRoles.includes(role) ? role : 'MEMBER';
        const user = await client_1.default.user.create({
            data: {
                name,
                email,
                phone: phone || null,
                cnic: cnic || null,
                password: hashedPassword,
                role: userRole,
            },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                cnic: true,
                role: true,
                avatar: true,
                isActive: true,
                createdAt: true,
            },
        });
        const token = (0, jwt_utils_1.signToken)({ id: user.id, email: user.email, role: user.role });
        (0, response_utils_1.sendCreated)(res, { user, token }, 'Registration successful');
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, 'Registration failed', 500, String(err));
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            (0, response_utils_1.sendBadRequest)(res, 'Email and password are required');
            return;
        }
        const user = await client_1.default.user.findUnique({ where: { email } });
        if (!user) {
            (0, response_utils_1.sendUnauthorized)(res, 'Invalid credentials');
            return;
        }
        if (!user.isActive) {
            (0, response_utils_1.sendUnauthorized)(res, 'Account is deactivated. Contact your administrator.');
            return;
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            (0, response_utils_1.sendUnauthorized)(res, 'Invalid credentials');
            return;
        }
        const token = (0, jwt_utils_1.signToken)({ id: user.id, email: user.email, role: user.role });
        const { password: _, ...userWithoutPassword } = user;
        (0, response_utils_1.sendSuccess)(res, { user: userWithoutPassword, token }, 'Login successful');
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, 'Login failed', 500, String(err));
    }
};
exports.login = login;
const getMe = async (req, res) => {
    try {
        if (!req.user) {
            (0, response_utils_1.sendUnauthorized)(res);
            return;
        }
        const user = await client_1.default.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                cnic: true,
                role: true,
                avatar: true,
                isActive: true,
                createdAt: true,
                _count: {
                    select: { committees: true, organized: true },
                },
            },
        });
        if (!user) {
            (0, response_utils_1.sendNotFound)(res, 'User not found');
            return;
        }
        (0, response_utils_1.sendSuccess)(res, user, 'Profile fetched');
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, 'Failed to fetch profile', 500, String(err));
    }
};
exports.getMe = getMe;
//# sourceMappingURL=auth.controller.js.map