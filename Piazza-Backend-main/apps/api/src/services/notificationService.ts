import prisma from '../prisma/client';
import { Server as SocketServer } from 'socket.io';
import logger from '../utils/logger';

let io: SocketServer | null = null;

export function setNotificationIO(socketIO: SocketServer) {
    io = socketIO;
}

export const notificationService = {
    async create(employeeId: string, message: string, type: string): Promise<void> {
        const notification = await prisma.notification.create({
            data: { employeeId, message, type },
        });

        // Emit real-time event to the specific employee's room
        if (io) {
            io.to(employeeId).emit('notification:new', {
                id: notification.id,
                message: notification.message,
                type: notification.type,
                createdAt: notification.createdAt,
            });
        }

        logger.info(`Notification sent to ${employeeId}: ${type}`);
    },

    async getByEmployee(employeeId: string, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [notifications, total] = await Promise.all([
            prisma.notification.findMany({
                where: { employeeId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.notification.count({ where: { employeeId } }),
        ]);

        return { notifications, total };
    },

    async markRead(notificationId: string) {
        return prisma.notification.update({
            where: { id: notificationId },
            data: { isRead: true },
        });
    },

    async markAllRead(employeeId: string) {
        return prisma.notification.updateMany({
            where: { employeeId, isRead: false },
            data: { isRead: true },
        });
    },

    async unreadCount(employeeId: string): Promise<number> {
        return prisma.notification.count({
            where: { employeeId, isRead: false },
        });
    },
};
