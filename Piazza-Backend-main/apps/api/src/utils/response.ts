import { Response } from 'express';

export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
}

export function sendSuccess(res: Response, data: any, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
        success: true,
        data,
        message,
    });
}

export function sendPaginated(res: Response, data: any[], pagination: PaginationMeta, message = 'Success') {
    return res.status(200).json({
        success: true,
        data,
        pagination,
        message,
    });
}

export function sendError(res: Response, error: string, code = 400) {
    return res.status(code).json({
        success: false,
        error,
        code,
    });
}
