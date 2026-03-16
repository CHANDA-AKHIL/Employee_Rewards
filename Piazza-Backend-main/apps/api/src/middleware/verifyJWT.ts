import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import redis from '../utils/redis';
import { sendError } from '../utils/response';

export interface AuthPayload {
    id: string;
    email: string;
    role: string;
    isSuperAdmin: boolean;
}

export interface AuthRequest extends Request {
    user?: AuthPayload;
}

export async function verifyJWT(req: AuthRequest, res: Response, next: NextFunction) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return sendError(res, 'No token provided', 401);
        }

        const token = authHeader.split(' ')[1];

        // Check if token is blacklisted (logged out)
        const isBlacklisted = await redis.get(`bl_${token}`);
        if (isBlacklisted) {
            return sendError(res, 'Token has been invalidated', 401);
        }

        // Check if session exists in Redis
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as AuthPayload;
        const session = await redis.get(`session_${decoded.id}`);
        if (!session) {
            return sendError(res, 'Session expired', 401);
        }

        req.user = decoded;
        next();
    } catch (error: any) {
        if (error.name === 'TokenExpiredError') {
            return sendError(res, 'Token expired', 401);
        }
        return sendError(res, 'Invalid token', 401);
    }
}
