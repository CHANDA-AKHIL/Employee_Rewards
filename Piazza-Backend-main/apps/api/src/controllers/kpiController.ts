import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { sendSuccess, sendPaginated, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/verifyJWT';
import { scoringEngine } from '../services/scoringEngine';
import { notificationService } from '../services/notificationService';

export const kpiController = {

    // ── LIST ──────────────────────────────────────────────────────────────────
    // FIX: Now correctly filters by ?status= query param
    // Admin sees all KPIs; employee sees only their own
    async list(req: AuthRequest, res: Response) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 50;
            const skip = (page - 1) * limit;
            const status = req.query.status as string | undefined;

            // Base filter: admin sees all, employee sees own
            const baseWhere = req.user?.role === 'ADMIN'
                ? {}
                : { assignedTo: req.user?.id };

            // FIX: Add status filter when provided
            // Supports single status (?status=COMPLETE) and comma-separated (?status=PENDING,COMPLETE)
            let statusFilter = {};
            if (status) {
                const statuses = status.split(',').map(s => s.trim().toUpperCase());
                if (statuses.length === 1) {
                    statusFilter = { status: statuses[0] };
                } else {
                    statusFilter = { status: { in: statuses } };
                }
            }

            const where = { ...baseWhere, ...statusFilter };

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

    // ── CREATE ────────────────────────────────────────────────────────────────
    async create(req: AuthRequest, res: Response) {
        try {
            const { title, description, pointValue, assignedTo } = req.body;

            if (!title || !pointValue || !assignedTo) {
                return sendError(res, 'Title, pointValue, and assignedTo are required', 400);
            }

            const employee = await prisma.employee.findFirst({
                where: { id: assignedTo, isDeleted: false },
            });
            if (!employee) {
                return sendError(res, 'Assigned employee not found', 404);
            }

            const kpi = await prisma.kpi.create({
                data: {
                    title,
                    description,
                    pointValue: parseInt(pointValue, 10),
                    assignedTo,
                },
            });

            await notificationService.create(
                assignedTo,
                `📋 New KPI assigned: "${title}" — worth ${pointValue} points`,
                'KPI_ASSIGNED'
            );

            return sendSuccess(res, kpi, 'KPI created and assigned', 201);
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },

    // ── GET BY ID ─────────────────────────────────────────────────────────────
    async getById(req: AuthRequest, res: Response) {
        try {
            const kpi = await prisma.kpi.findUnique({
                where: { id: req.params.id },
                include: {
                    employee: { select: { id: true, name: true, email: true } },
                },
            });

            if (!kpi) return sendError(res, 'KPI not found', 404);

            if (req.user?.role !== 'ADMIN' && kpi.assignedTo !== req.user?.id) {
                return sendError(res, 'Forbidden', 403);
            }

            return sendSuccess(res, kpi);
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },

    // ── UPDATE ────────────────────────────────────────────────────────────────
    async update(req: AuthRequest, res: Response) {
        try {
            const { title, description, pointValue, assignedTo } = req.body;

            const kpi = await prisma.kpi.findUnique({ where: { id: req.params.id } });
            if (!kpi) return sendError(res, 'KPI not found', 404);

            const updated = await prisma.kpi.update({
                where: { id: req.params.id },
                data: {
                    ...(title && { title }),
                    ...(description !== undefined && { description }),
                    ...(pointValue && { pointValue: parseInt(pointValue, 10) }),
                    ...(assignedTo && { assignedTo }),
                },
            });

            return sendSuccess(res, updated, 'KPI updated');
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },

    // ── DELETE ────────────────────────────────────────────────────────────────
    async remove(req: AuthRequest, res: Response) {
        try {
            const kpi = await prisma.kpi.findUnique({ where: { id: req.params.id } });
            if (!kpi) return sendError(res, 'KPI not found', 404);

            await prisma.kpi.delete({ where: { id: req.params.id } });
            return sendSuccess(res, null, 'KPI deleted');
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },

    // ── SUBMIT ────────────────────────────────────────────────────────────────
    // Employee marks their KPI as complete (PENDING → COMPLETE)
    // FIX: Admin can also call this to submit on behalf of an employee
    // (needed when admin approves a PENDING KPI directly from Approvals page)
    async submit(req: AuthRequest, res: Response) {
        try {
            const kpi = await prisma.kpi.findUnique({ where: { id: req.params.id } });
            if (!kpi) return sendError(res, 'KPI not found', 404);

            // FIX: Allow admin to submit on behalf of any employee
            // Employee can only submit their own KPI
            if (req.user?.role !== 'ADMIN' && kpi.assignedTo !== req.user?.id) {
                return sendError(res, 'You can only submit your own KPIs', 403);
            }

            if (kpi.status !== 'PENDING') {
                // If already COMPLETE or beyond, just return success — idempotent
                return sendSuccess(res, kpi, 'KPI already submitted');
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

    // ── APPROVE ───────────────────────────────────────────────────────────────
    // FIX: Accept both COMPLETE and PENDING status
    // If PENDING → auto-submit first, then approve in one atomic flow
    async approve(req: AuthRequest, res: Response) {
        try {
            const kpi = await prisma.kpi.findUnique({ where: { id: req.params.id } });
            if (!kpi) return sendError(res, 'KPI not found', 404);

            if (kpi.status === 'APPROVED') {
                return sendError(res, 'KPI is already approved', 400);
            }

            if (kpi.status === 'REJECTED') {
                return sendError(res, 'Cannot approve a rejected KPI. Ask employee to resubmit.', 400);
            }

            // FIX: If PENDING, auto-submit first (PENDING → COMPLETE → APPROVED)
            if (kpi.status === 'PENDING') {
                await prisma.kpi.update({
                    where: { id: req.params.id },
                    data: { status: 'COMPLETE', submittedAt: new Date() },
                });
            }

            // Now approve (status is COMPLETE, either from above or already was)
            const updated = await prisma.kpi.update({
                where: { id: req.params.id },
                data: { status: 'APPROVED', approvedAt: new Date() },
            });

            // Trigger scoring: awards points, updates streak, evaluates badges, recalculates leaderboard
            await scoringEngine.processApproval(updated.id);

            // Notify employee
            await notificationService.create(
                kpi.assignedTo,
                `✅ Your KPI "${kpi.title}" has been approved! You earned ${kpi.pointValue} points.`,
                'KPI_APPROVED'
            );

            return sendSuccess(res, updated, 'KPI approved and points awarded');
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },

    // ── REJECT ────────────────────────────────────────────────────────────────
    // FIX: Accept both COMPLETE and PENDING status for rejection
    async reject(req: AuthRequest, res: Response) {
        try {
            const { reason } = req.body;

            const kpi = await prisma.kpi.findUnique({ where: { id: req.params.id } });
            if (!kpi) return sendError(res, 'KPI not found', 404);

            if (kpi.status === 'APPROVED') {
                return sendError(res, 'Cannot reject an already approved KPI', 400);
            }

            if (kpi.status === 'REJECTED') {
                return sendError(res, 'KPI is already rejected', 400);
            }

            // FIX: Allow rejecting PENDING KPIs too (not just COMPLETE)
            const updated = await prisma.kpi.update({
                where: { id: req.params.id },
                data: {
                    status: 'REJECTED',
                    rejectReason: reason?.trim() || 'No reason provided',
                },
            });

            await notificationService.create(
                kpi.assignedTo,
                `❌ Your KPI "${kpi.title}" was rejected. Reason: ${reason?.trim() || 'No reason provided'}`,
                'KPI_REJECTED'
            );

            return sendSuccess(res, updated, 'KPI rejected');
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },
};