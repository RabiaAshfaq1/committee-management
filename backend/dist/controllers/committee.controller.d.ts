import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
export declare const createCommittee: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getAllCommittees: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getCommitteeById: (req: AuthRequest, res: Response) => Promise<void>;
export declare const updateCommittee: (req: AuthRequest, res: Response) => Promise<void>;
export declare const deleteCommittee: (req: AuthRequest, res: Response) => Promise<void>;
export declare const addMember: (req: AuthRequest, res: Response) => Promise<void>;
export declare const removeMember: (req: AuthRequest, res: Response) => Promise<void>;
export declare const assignTurns: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=committee.controller.d.ts.map