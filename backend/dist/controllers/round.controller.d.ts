import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
export declare const startRound: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getRoundsByCommittee: (req: AuthRequest, res: Response) => Promise<void>;
export declare const submitPayoutTransaction: (req: AuthRequest, res: Response) => Promise<void>;
export declare const completeRound: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=round.controller.d.ts.map