import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../prisma/client';
import { sendSuccess, sendPaginated, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/verifyJWT';
import { notificationService } from '../services/notificationService';
import { scoringEngine } from '../services/scoringEngine';

export const employeeController = {

    async list(req: Request, res: Response) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;
            const skip = (page - 1) * limit;

            const [employees, total] = await Promise.all([
                prisma.employee.findMany({
                    where: { isDeleted: false },
                    select: {
                        id: true, name: true, email: true, role: true,
                        department: true, level: true, totalPoints: true,
                        streakCount: true, isDeleted: true, createdAt: true,
                    },
                    skip, take: limit,
                    orderBy: { createdAt: 'desc' },
                }),
                prisma.employee.count({ where: { isDeleted: false } }),
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
            if (existing) return sendError(res, 'Email already exists', 409);

            const passwordHash = await bcrypt.hash(password, 12);
            const employee = await prisma.employee.create({
                data: { name, email, passwordHash, role: role || 'EMPLOYEE', department },
            });

            return sendSuccess(res, {
                id: employee.id, name: employee.name,
                email: employee.email, role: employee.role, department: employee.department,
            }, 'Employee created', 201);
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },

    async getById(req: AuthRequest, res: Response) {
        try {
            const employee = await prisma.employee.findFirst({
                where: { id: req.params.id, isDeleted: false },
                select: {
                    id: true, name: true, email: true, role: true,
                    department: true, level: true, totalPoints: true,
                    streakCount: true, createdAt: true,
                },
            });
            if (!employee) return sendError(res, 'Employee not found', 404);
            return sendSuccess(res, employee);
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },

    // ── Employee updates own profile ───────────────────────────────────────────
    async updateMe(req: AuthRequest, res: Response) {
        try {
            const employeeId = req.user!.id;
            const { name, department, currentPassword, newPassword } = req.body;

            const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
            if (!employee) return sendError(res, 'Employee not found', 404);

            const updateData: any = {};
            if (name?.trim()) updateData.name = name.trim();
            if (department?.trim()) updateData.department = department.trim();

            if (newPassword) {
                if (!currentPassword) return sendError(res, 'Current password is required', 400);
                const isMatch = await bcrypt.compare(currentPassword, employee.passwordHash);
                if (!isMatch) return sendError(res, 'Current password is incorrect', 401);
                if (newPassword.length < 6) return sendError(res, 'New password must be at least 6 characters', 400);
                updateData.passwordHash = await bcrypt.hash(newPassword, 12);
            }

            if (Object.keys(updateData).length === 0) return sendError(res, 'No fields to update', 400);

            const updated = await prisma.employee.update({
                where: { id: employeeId },
                data: updateData,
                select: {
                    id: true, name: true, email: true,
                    role: true, department: true, level: true, totalPoints: true,
                },
            });

            return sendSuccess(res, updated, 'Profile updated successfully');
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },

    async update(req: Request, res: Response) {
        try {
            const { name, email, department, role, level } = req.body;
            const kpi = await prisma.employee.findFirst({ where: { id: req.params.id, isDeleted: false } });
            if (!kpi) return sendError(res, 'Employee not found', 404);

            const updated = await prisma.employee.update({
                where: { id: req.params.id },
                data: {
                    ...(name && { name }),
                    ...(email && { email }),
                    ...(department && { department }),
                    ...(role && { role }),
                    ...(level !== undefined && { level }),
                },
                select: { id: true, name: true, email: true, role: true, department: true, level: true },
            });
            return sendSuccess(res, updated, 'Employee updated');
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },

    async softDelete(req: Request, res: Response) {
        try {
            const emp = await prisma.employee.findFirst({ where: { id: req.params.id, isDeleted: false } });
            if (!emp) return sendError(res, 'Employee not found', 404);
            await prisma.employee.update({ where: { id: req.params.id }, data: { isDeleted: true } });
            return sendSuccess(res, null, 'Employee deleted');
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },

    async toggleBlock(req: Request, res: Response) {
        try {
            const emp = await prisma.employee.findFirst({ where: { id: req.params.id } });
            if (!emp) return sendError(res, 'Employee not found', 404);
            const updated = await prisma.employee.update({
                where: { id: req.params.id },
                data: { isDeleted: !emp.isDeleted },
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
            if (!employee) return sendError(res, 'Employee not found', 404);

            const [badgeCount, kpiCount, rank, redemptionCount] = await Promise.all([
                prisma.employeeBadge.count({ where: { employeeId: id } }),
                prisma.kpi.count({ where: { assignedTo: id, status: 'APPROVED' } }),
                prisma.leaderboard.findUnique({ where: { employeeId: id } }),
                prisma.redemption.count({ where: { employeeId: id, status: 'APPROVED' } }),
            ]);

            return sendSuccess(res, {
                totalPoints: employee.totalPoints,
                level: employee.level,
                streakCount: employee.streakCount,
                badgesEarned: badgeCount,
                kpisCompleted: kpiCount,
                rewardsRedeemed: redemptionCount,
                rank: rank?.rank || 0,
            });
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },

    // ── Peer-to-peer recognition ───────────────────────────────────────────────
    // FIX: Points are deducted from GIVER and added to RECEIVER
    // This makes it fair — you spend your own points to recognise someone
    async recognize(req: AuthRequest, res: Response) {
        try {
            const giverId = req.user!.id;
            const receiverId = req.params.id;
            const { points, message } = req.body;

            if (!points || !message) return sendError(res, 'points and message are required', 400);

            const pts = parseInt(points, 10);
            if (isNaN(pts) || pts <= 0 || pts > 100) {
                return sendError(res, 'Points must be between 1 and 100', 400);
            }
            if (giverId === receiverId) return sendError(res, 'You cannot recognise yourself', 400);

            const [giver, receiver] = await Promise.all([
                prisma.employee.findFirst({ where: { id: giverId, isDeleted: false } }),
                prisma.employee.findFirst({ where: { id: receiverId, isDeleted: false } }),
            ]);

            if (!giver) return sendError(res, 'Sender not found', 404);
            if (!receiver) return sendError(res, 'Recipient not found', 404);

            // FIX: Check giver has enough points
            if (giver.totalPoints < pts) {
                return sendError(res, `Insufficient points. You have ${giver.totalPoints} pts but tried to give ${pts} pts.`, 400);
            }

            // Atomic transaction: deduct from giver, add to receiver
            await prisma.$transaction([
                // Deduct from giver
                prisma.employee.update({
                    where: { id: giverId },
                    data: { totalPoints: { decrement: pts } },
                }),
                prisma.pointsLedger.create({
                    data: {
                        employeeId: giverId,
                        points: -pts,
                        reason: `🌟 Recognition given to ${receiver.name}: "${message}"`,
                    },
                }),
                // Add to receiver
                prisma.employee.update({
                    where: { id: receiverId },
                    data: { totalPoints: { increment: pts } },
                }),
                prisma.pointsLedger.create({
                    data: {
                        employeeId: receiverId,
                        points: pts,
                        reason: `🌟 Recognition from ${giver.name}: "${message}"`,
                    },
                }),
            ]);

            // Re-evaluate badges and leaderboard for receiver
            const updatedReceiver = await prisma.employee.findUnique({ where: { id: receiverId } });
            if (updatedReceiver) {
                await scoringEngine.evaluateBadges(receiverId, updatedReceiver.totalPoints);
                await scoringEngine.recalculateLeaderboard();
            }

            // Notify receiver
            await notificationService.create(
                receiverId,
                `🌟 ${giver.name} recognised you with ${pts} points: "${message}"`,
                'RECOGNITION_RECEIVED'
            );

            return sendSuccess(res, {
                giverId,
                receiverId,
                points: pts,
                message,
                giverRemainingPoints: giver.totalPoints - pts,
            }, 'Recognition sent!', 201);
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },
};