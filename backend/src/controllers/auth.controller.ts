import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../prisma/client';
import { signToken } from '../utils/jwt.utils';
import {
  sendSuccess,
  sendCreated,
  sendBadRequest,
  sendUnauthorized,
  sendError,
  sendNotFound,
} from '../utils/response.utils';
import { AuthRequest } from '../middleware/auth.middleware';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phone, cnic, password, role } = req.body;

    if (!name || !email || !password) {
      sendBadRequest(res, 'Name, email and password are required');
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      sendBadRequest(res, 'Email already registered');
      return;
    }

    if (cnic) {
      const existingCnic = await prisma.user.findUnique({ where: { cnic } });
      if (existingCnic) {
        sendBadRequest(res, 'CNIC already registered');
        return;
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const allowedRoles = ['ORGANIZER', 'MEMBER'];
    const userRole = role && allowedRoles.includes(role) ? role : 'MEMBER';

    const user = await prisma.user.create({
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

    const token = signToken({ id: user.id, email: user.email, role: user.role });
    sendCreated(res, { user, token }, 'Registration successful');
  } catch (err) {
    sendError(res, 'Registration failed', 500, String(err));
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      sendBadRequest(res, 'Email and password are required');
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      sendUnauthorized(res, 'Invalid credentials');
      return;
    }

    if (!user.isActive) {
      sendUnauthorized(res, 'Account is deactivated. Contact your administrator.');
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      sendUnauthorized(res, 'Invalid credentials');
      return;
    }

    const token = signToken({ id: user.id, email: user.email, role: user.role });

    const { password: _, ...userWithoutPassword } = user;
    sendSuccess(res, { user: userWithoutPassword, token }, 'Login successful');
  } catch (err) {
    sendError(res, 'Login failed', 500, String(err));
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    const user = await prisma.user.findUnique({
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
      sendNotFound(res, 'User not found');
      return;
    }

    sendSuccess(res, user, 'Profile fetched');
  } catch (err) {
    sendError(res, 'Failed to fetch profile', 500, String(err));
  }
};
