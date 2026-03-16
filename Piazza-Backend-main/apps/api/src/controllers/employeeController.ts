import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../prisma/client';
import { sendSuccess, sendPaginated, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/verifyJWT';

export const employeeController = {
    async list(req: Request, res: Response) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;
            const skip = (page - 1) * limit;

            const [employees, total] = await Promise.all([
                prisma.employee.findMany({
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        department: true,
                        level: true,
                        totalPoints: true,
                        streakCount: true,
                        isDeleted: true,
                        createdAt: true,
                    },
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                }),
                prisma.employee.count(),
            ]);

            return sendPaginated(res, employees, { page, limit, total });
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },

    async create(req: Request, res: Response) {
        try {
            const { name, email, password, role, department } = req.body;

            if (!name || !email || !password) {
                return sendError(res, 'Name, email, and password are required', 400);
            }

            const existing = await prisma.employee.findUnique({ where: { email } });
            if (existing) {
                return sendError(res, 'Email already exists', 409);
            }

            const passwordHash = await bcrypt.hash(password, 12);
            const employee = await prisma.employee.create({
                data: { name, email, passwordHash, role: role || 'EMPLOYEE', department },
            });

            return sendSuccess(
                res,
                {
                    id: employee.id,
                    name: employee.name,
                    email: employee.email,
                    role: employee.role,
                    department: employee.department,
                },
                'Employee created',
                201
            );
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },

    async getById(req: AuthRequest, res: Response) {
        try {
            const employee = await prisma.employee.findFirst({
                where: { id: req.params.id, isDeleted: false },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    department: true,
                    level: true,
                    totalPoints: true,
                    streakCount: true,
                    createdAt: true,
                },
            });

            if (!employee) {
                return sendError(res, 'Employee not found', 404);
            }

            return sendSuccess(res, employee);
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },

    async update(req: Request, res: Response) {
        try {
            const { name, email, department, role, level } = req.body;
            const employee = await prisma.employee.findFirst({
                where: { id: req.params.id, isDeleted: false },
            });

            if (!employee) {
                return sendError(res, 'Employee not found', 404);
            }

            const updated = await prisma.employee.update({
                where: { id: req.params.id },
                data: {
                    ...(name && { name }),
                    ...(email && { email }),
                    ...(department && { department }),
                    ...(role && { role }),
                    ...(level !== undefined && { level }),
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    department: true,
                    level: true,
                },
            });

            return sendSuccess(res, updated, 'Employee updated');
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },

    async softDelete(req: Request, res: Response) {
        try {
            const employee = await prisma.employee.findFirst({
                where: { id: req.params.id, isDeleted: false },
            });

            if (!employee) {
                return sendError(res, 'Employee not found', 404);
            }

            await prisma.employee.update({
                where: { id: req.params.id },
                data: { isDeleted: true },
            });

            return sendSuccess(res, null, 'Employee deleted');
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },

    async toggleBlock(req: Request, res: Response) {
        try {
            const employee = await prisma.employee.findFirst({
                where: { id: req.params.id },
            });

            if (!employee) {
                return sendError(res, 'Employee not found', 404);
            }

            const updated = await prisma.employee.update({
                where: { id: req.params.id },
                data: { isDeleted: !employee.isDeleted },
            });

            return sendSuccess(res, updated, `Employee ${updated.isDeleted ? 'blocked' : 'unblocked'}`);
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },

    async getStats(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;

            const employee = await prisma.employee.findFirst({
                where: { id, isDeleted: false },
                select: { totalPoints: true, level: true, streakCount: true },
            });

            if (!employee) {
                return sendError(res, 'Employee not found', 404);
            }

            const [badgeCount, kpiCount, rank] = await Promise.all([
                prisma.employeeBadge.count({ where: { employeeId: id } }),
                prisma.kpi.count({ where: { assignedTo: id, status: 'APPROVED' } }),
                prisma.leaderboard.findUnique({ where: { employeeId: id } }),
            ]);

            return sendSuccess(res, {
                totalPoints: employee.totalPoints,
                level: employee.level,
                streakCount: employee.streakCount,
                badgesEarned: badgeCount,
                kpisCompleted: kpiCount,
                rank: rank?.rank || 0,
            });
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },
};
