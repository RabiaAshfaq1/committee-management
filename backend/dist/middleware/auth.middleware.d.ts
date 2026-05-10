import { Request, Response, NextFunction } from 'express';
import { JwtPayload } from '../utils/jwt.utils';
export interface AuthRequest extends Request {
    user?: JwtPayload;
}
export declare const authenticate: (req: AuthRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.middleware.d.ts.map