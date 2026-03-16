import { Response, NextFunction } from 'express';
import { AuthRequest } from './verifyJWT';
import prisma from '../prisma/client';
import logger from '../utils/logger';

export function auditLog(action: string, targetTable: string) {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        // Store original json method to intercept response
        const originalJson = res.json.bind(res);

        res.json = function (body: any) {
            // Only log successful admin actions
            if (req.user && req.user.role === 'ADMIN' && body?.success) {
                const targetId = req.params.id || body?.data?.id || null;
                prisma.auditLog
                    .create({
                        data: {
                            adminId: req.user.id,
                            action,
                            targetTable,
                            targetId,
                            metadata: JSON.stringify({
                                method: req.method,
                                path: req.originalUrl,
                                body: req.body,
                            }),
                        },
                    })
                    .catch((err) => {
                        logger.error('Failed to write audit log', err);
                    });
            }
            return originalJson(body);
        };

        next();
    };
}
