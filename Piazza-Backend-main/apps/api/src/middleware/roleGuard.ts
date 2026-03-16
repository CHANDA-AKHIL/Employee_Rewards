import { Response, NextFunction } from 'express';
import { AuthRequest } from './verifyJWT';
import { sendError } from '../utils/response';

export function roleGuard(...roles: string[]) {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return sendError(res, 'Authentication required', 401);
        }

        if (!roles.includes(req.user.role)) {
            return sendError(res, 'Insufficient permissions', 403);
        }

        next();
    };
}
