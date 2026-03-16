import { Response } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/verifyJWT';
import { notificationService } from '../services/notificationService';

export const notificationController = {
    async list(req: AuthRequest, res: Response) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;

            const { notifications, total } = await notificationService.getByEmployee(
                req.user!.id,
                page,
                limit
            );

            return res.status(200).json({
                success: true,
                data: notifications,
                pagination: { page, limit, total },
                message: 'Success',
            });
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },

    async markRead(req: AuthRequest, res: Response) {
        try {
            const notification = await notificationService.markRead(req.params.id);
            return sendSuccess(res, notification, 'Notification marked as read');
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },

    async markAllRead(req: AuthRequest, res: Response) {
        try {
            await notificationService.markAllRead(req.user!.id);
            return sendSuccess(res, null, 'All notifications marked as read');
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },

    async unreadCount(req: AuthRequest, res: Response) {
        try {
            const count = await notificationService.unreadCount(req.user!.id);
            return sendSuccess(res, { count });
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },
};
