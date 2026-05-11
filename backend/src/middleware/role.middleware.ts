import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { sendForbidden } from '../utils/response.utils';

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendForbidden(res, 'Not authenticated');
      return;
    }
    if (!roles.includes(req.user.role)) {
      sendForbidden(res, `Access denied. Required roles: ${roles.join(', ')}`);
      return;
    }
    next();
  };
};

export const requireAdmin = requireRole('ADMIN');
export const requireAnyRole = requireRole('ADMIN', 'MEMBER');
