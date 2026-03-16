import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';
import logger from '../utils/logger';

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
    logger.error('Unhandled error:', {
        message: err.message,
        stack: err.stack,
        path: req.originalUrl,
    });

    const statusCode = err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;

    return sendError(res, message, statusCode);
}
