import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Prisma, Role } from '@prisma/client';
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
    const raw = req.body as Record<string, unknown>;
    const name = typeof raw.name === 'string' ? raw.name.trim() : '';
    const email = typeof raw.email === 'string' ? raw.email.trim().toLowerCase() : '';
    const phone = typeof raw.phone === 'string' && raw.phone.trim() ? raw.phone.trim() : undefined;
    const cnicRaw = typeof raw.cnic === 'string' ? raw.cnic.trim() : '';
    const cnic = cnicRaw || undefined;
    const password = typeof raw.password === 'string' ? raw.password : '';
    const role = typeof raw.role === 'string' ? raw.role : undefined;

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

    if (password.length < 6) {
      sendBadRequest(res, 'Password must be at least 6 characters');
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const userRole: Role = role === 'ADMIN' ? Role.ADMIN : Role.MEMBER;

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone: phone ?? null,
        cnic: cnic ?? null,
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
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2022') {
        sendError(
          res,
          'Database is missing a required column (often trustScore on User). Run prisma/sql/add-user-trust-score.sql in Supabase SQL Editor, or align your DB with prisma/schema.prisma.',
          503,
          err.message,
        );
        return;
      }
      if (err.code === 'P2002') {
        const target = (err.meta?.target as string[] | undefined)?.join(', ') || 'field';
        sendBadRequest(res, `That ${target} is already in use`);
        return;
      }
    }
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('trustScore') && msg.includes('does not exist')) {
      sendError(
        res,
        'Database is missing User.trustScore. Run backend/prisma/sql/add-user-trust-score.sql on your database (Supabase → SQL Editor).',
        503,
        msg,
      );
      return;
    }
    if (msg.includes('not found in enum') && msg.includes('Role')) {
      sendError(
        res,
        'Database Role enum does not match Prisma (e.g. rows use ORGANIZER, or ADMIN is missing from Postgres). From backend/, run: pwsh -File scripts/fix-legacy-role-enum.ps1 — or run prisma/sql/add-role-enum-admin.sql, add-role-enum-member.sql, then migrate-legacy-user-roles.sql in order in Supabase SQL Editor.',
        503,
        msg,
      );
      return;
    }
    sendError(res, 'Registration failed', 500, msg);
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const raw = req.body as { email?: unknown; password?: unknown };
    const email =
      typeof raw.email === 'string' ? raw.email.trim().toLowerCase() : '';
    const password = typeof raw.password === 'string' ? raw.password.trim() : '';
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
