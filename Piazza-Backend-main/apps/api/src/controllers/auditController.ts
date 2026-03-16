import { Response } from 'express';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { AuthRequest } from '../middleware/verifyJWT';
import prisma from '../prisma/client';

export const auditController = {
    async list(req: AuthRequest, res: Response) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;
            const skip = (page - 1) * limit;

            const [logs, total] = await Promise.all([
                prisma.auditLog.findMany({
                    include: {
                        admin: { select: { name: true, email: true } }
                    },
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take: limit
                }),
                prisma.auditLog.count()
            ]);

            return sendPaginated(res, logs, { page, limit, total });
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    }
};
