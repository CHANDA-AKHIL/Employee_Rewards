import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';
import { AuthPayload } from '../middleware/verifyJWT';

export function setupSocketHandlers(io: SocketServer) {
    // JWT Auth middleware for socket connections
    io.use((socket: Socket, next) => {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

        if (!token) {
            return next(new Error('Authentication required'));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as AuthPayload;
            (socket as any).user = decoded;
            next();
        } catch {
            return next(new Error('Invalid token'));
        }
    });

    io.on('connection', (socket: Socket) => {
        const user = (socket as any).user as AuthPayload;
        logger.info(`Socket connected: ${user.id} (${user.email})`);

        // Join personal room for targeted notifications
        socket.join(user.id);

        socket.on('disconnect', () => {
            logger.info(`Socket disconnected: ${user.id}`);
        });
    });

    logger.info('Socket.io handlers initialized');
}
