import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
export declare const getAllMembers: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getMemberById: (req: AuthRequest, res: Response) => Promise<void>;
export declare const createMember: (req: AuthRequest, res: Response) => Promise<void>;
export declare const updateMember: (req: AuthRequest, res: Response) => Promise<void>;
export declare const deactivateMember: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=member.controller.d.ts.map