import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
export declare const markPaymentPaid: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getPaymentsByRound: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getPaymentsByMember: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getOverduePayments: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getAllPayments: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=payment.controller.d.ts.map