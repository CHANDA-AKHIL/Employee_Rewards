import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { sendSuccess, sendPaginated, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/verifyJWT';
import { scoringEngine } from '../services/scoringEngine';
import { notificationService } from '../services/notificationService';

export const kpiController = {
    async list(req: AuthRequest, res: Response) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;
            const skip = (page - 1) * limit;

            const where =
                req.user?.role === 'ADMIN'
                    ? {}
                    : { assignedTo: req.user?.id };

            const [kpis, total] = await Promise.all([
                prisma.kpi.findMany({
                    where,
                    include: {
                        employee: { select: { id: true, name: true, email: true } },
                    },
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                }),
                prisma.kpi.count({ where }),
            ]);

            return sendPaginated(res, kpis, { page, limit, total });
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },

    async create(req: AuthRequest, res: Response) {
        try {
            const { title, description, pointValue, assignedTo } = req.body;

            if (!title || !pointValue || !assignedTo) {
                return sendError(res, 'Title, pointValue, and assignedTo are required', 400);
            }

            // Verify employee exists
            const employee = await prisma.employee.findFirst({
                where: { id: assignedTo, isDeleted: false },
            });
            if (!employee) {
                return sendError(res, 'Assigned employee not found', 404);
            }

            const kpi = await prisma.kpi.create({
                data: { title, description, pointValue, assignedTo },
            });

            // Notify employee
            await notificationService.create(
                assignedTo,
                `📋 New KPI assigned: ${title}`,
                'KPI_ASSIGNED'
            );

            return sendSuccess(res, kpi, 'KPI created', 201);
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },

    async getById(req: AuthRequest, res: Response) {
        try {
            const kpi = await prisma.kpi.findUnique({
                where: { id: req.params.id },
                include: {
                    employee: { select: { id: true, name: true, email: true } },
                },
            });

            if (!kpi) {
                return sendError(res, 'KPI not found', 404);
            }

            // Ensure employees can only see their own KPIs
            if (req.user?.role !== 'ADMIN' && kpi.assignedTo !== req.user?.id) {
                return sendError(res, 'Forbidden', 403);
            }

            return sendSuccess(res, kpi);
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },

    async update(req: AuthRequest, res: Response) {
        try {
            const { title, description, pointValue, assignedTo } = req.body;

            const kpi = await prisma.kpi.findUnique({ where: { id: req.params.id } });
            if (!kpi) {
                return sendError(res, 'KPI not found', 404);
            }

            const updated = await prisma.kpi.update({
                where: { id: req.params.id },
                data: {
                    ...(title && { title }),
                    ...(description !== undefined && { description }),
                    ...(pointValue && { pointValue }),
                    ...(assignedTo && { assignedTo }),
                },
            });

            return sendSuccess(res, updated, 'KPI updated');
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },

    async remove(req: AuthRequest, res: Response) {
        try {
            const kpi = await prisma.kpi.findUnique({ where: { id: req.params.id } });
            if (!kpi) {
                return sendError(res, 'KPI not found', 404);
            }

            await prisma.kpi.delete({ where: { id: req.params.id } });
            return sendSuccess(res, null, 'KPI deleted');
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },

    async submit(req: AuthRequest, res: Response) {
        try {
            const kpi = await prisma.kpi.findUnique({ where: { id: req.params.id } });
            if (!kpi) {
                return sendError(res, 'KPI not found', 404);
            }

            if (kpi.assignedTo !== req.user?.id) {
                return sendError(res, 'You can only submit your own KPIs', 403);
            }

            if (kpi.status !== 'PENDING') {
                return sendError(res, 'KPI is not in PENDING status', 400);
            }

            const updated = await prisma.kpi.update({
                where: { id: req.params.id },
                data: { status: 'COMPLETE', submittedAt: new Date() },
            });

            return sendSuccess(res, updated, 'KPI submitted for approval');
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },

    async approve(req: AuthRequest, res: Response) {
        try {
            const kpi = await prisma.kpi.findUnique({ where: { id: req.params.id } });
            if (!kpi) {
                return sendError(res, 'KPI not found', 404);
            }

            if (kpi.status !== 'COMPLETE') {
                return sendError(res, 'KPI must be in COMPLETE status to approve', 400);
            }

            const updated = await prisma.kpi.update({
                where: { id: req.params.id },
                data: { status: 'APPROVED', approvedAt: new Date() },
            });

            // Trigger scoring engine
            await scoringEngine.processApproval(updated.id);

            // Notify employee
            await notificationService.create(
                kpi.assignedTo,
                `✅ Your KPI "${kpi.title}" has been approved! You earned ${kpi.pointValue} points.`,
                'KPI_APPROVED'
            );

            return sendSuccess(res, updated, 'KPI approved and scoring processed');
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },

    async reject(req: AuthRequest, res: Response) {
        try {
            const { reason } = req.body;
            const kpi = await prisma.kpi.findUnique({ where: { id: req.params.id } });
            if (!kpi) {
                return sendError(res, 'KPI not found', 404);
            }

            if (kpi.status !== 'COMPLETE') {
                return sendError(res, 'KPI must be in COMPLETE status to reject', 400);
            }

            const updated = await prisma.kpi.update({
                where: { id: req.params.id },
                data: { status: 'REJECTED', rejectReason: reason || 'No reason provided' },
            });

            // Notify employee
            await notificationService.create(
                kpi.assignedTo,
                `❌ Your KPI "${kpi.title}" was rejected. Reason: ${reason || 'No reason provided'}`,
                'KPI_REJECTED'
            );

            return sendSuccess(res, updated, 'KPI rejected');
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },
};
