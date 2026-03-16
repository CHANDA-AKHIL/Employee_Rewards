import { Response } from 'express';
import prisma from '../prisma/client';
import { sendSuccess, sendPaginated, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/verifyJWT';
import { notificationService } from '../services/notificationService';
import { emailService } from '../services/emailService';

export const redemptionController = {
    async list(req: AuthRequest, res: Response) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;
            const skip = (page - 1) * limit;

            const where =
                req.user?.role === 'ADMIN'
                    ? {}
                    : { employeeId: req.user?.id };

            const [redemptions, total] = await Promise.all([
                prisma.redemption.findMany({
                    where,
                    include: {
                        reward: { select: { id: true, name: true, pointCost: true } },
                        employee: { select: { id: true, name: true, email: true } },
                    },
                    skip,
                    take: limit,
                    orderBy: { requestedAt: 'desc' },
                }),
                prisma.redemption.count({ where }),
            ]);

            return sendPaginated(res, redemptions, { page, limit, total });
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },

    async create(req: AuthRequest, res: Response) {
        try {
            const { rewardId } = req.body;
            const employeeId = req.user!.id;

            if (!rewardId) {
                return sendError(res, 'rewardId is required', 400);
            }

            const reward = await prisma.reward.findUnique({ where: { id: rewardId } });
            if (!reward) {
                return sendError(res, 'Reward not found', 404);
            }

            if (reward.stock <= 0) {
                return sendError(res, 'Reward is out of stock', 400);
            }

            const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
            if (!employee) {
                return sendError(res, 'Employee not found', 404);
            }

            if (employee.totalPoints < reward.pointCost) {
                return sendError(res, 'Insufficient points', 400);
            }

            // Check for duplicate pending redemption
            const existingPending = await prisma.redemption.findFirst({
                where: { employeeId, rewardId, status: 'PENDING' },
            });
            if (existingPending) {
                return sendError(res, 'You already have a pending redemption for this reward', 400);
            }

            // Deduct points and create redemption in a transaction
            const [redemption] = await prisma.$transaction([
                prisma.redemption.create({
                    data: { employeeId, rewardId },
                }),
                prisma.employee.update({
                    where: { id: employeeId },
                    data: { totalPoints: { decrement: reward.pointCost } },
                }),
                prisma.pointsLedger.create({
                    data: {
                        employeeId,
                        points: -reward.pointCost,
                        reason: `Redeemed: ${reward.name}`,
                    },
                }),
                prisma.reward.update({
                    where: { id: rewardId },
                    data: { stock: { decrement: 1 } },
                }),
            ]);

            return sendSuccess(res, redemption, 'Redemption requested', 201);
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },

    async getById(req: AuthRequest, res: Response) {
        try {
            const redemption = await prisma.redemption.findUnique({
                where: { id: req.params.id },
                include: {
                    reward: true,
                    employee: { select: { id: true, name: true, email: true } },
                },
            });

            if (!redemption) {
                return sendError(res, 'Redemption not found', 404);
            }

            if (req.user?.role !== 'ADMIN' && redemption.employeeId !== req.user?.id) {
                return sendError(res, 'Forbidden', 403);
            }

            return sendSuccess(res, redemption);
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },

    async approve(req: AuthRequest, res: Response) {
        try {
            const redemption = await prisma.redemption.findUnique({
                where: { id: req.params.id },
                include: { reward: true, employee: true },
            });

            if (!redemption) {
                return sendError(res, 'Redemption not found', 404);
            }

            if (redemption.status !== 'PENDING') {
                return sendError(res, 'Redemption is not in PENDING status', 400);
            }

            const updated = await prisma.redemption.update({
                where: { id: req.params.id },
                data: { status: 'APPROVED', resolvedAt: new Date() },
            });

            // Notify employee
            await notificationService.create(
                redemption.employeeId,
                `🎉 Your redemption for "${redemption.reward.name}" has been approved!`,
                'REWARD_APPROVED'
            );

            // Send email
            await emailService.sendRewardApproved(
                redemption.employee.email,
                redemption.employee.name,
                redemption.reward.name
            );

            return sendSuccess(res, updated, 'Redemption approved');
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },

    async reject(req: AuthRequest, res: Response) {
        try {
            const redemption = await prisma.redemption.findUnique({
                where: { id: req.params.id },
                include: { reward: true, employee: true },
            });

            if (!redemption) {
                return sendError(res, 'Redemption not found', 404);
            }

            if (redemption.status !== 'PENDING') {
                return sendError(res, 'Redemption is not in PENDING status', 400);
            }

            // Refund points in a transaction
            const [updated] = await prisma.$transaction([
                prisma.redemption.update({
                    where: { id: req.params.id },
                    data: { status: 'REJECTED', resolvedAt: new Date() },
                }),
                prisma.employee.update({
                    where: { id: redemption.employeeId },
                    data: { totalPoints: { increment: redemption.reward.pointCost } },
                }),
                prisma.pointsLedger.create({
                    data: {
                        employeeId: redemption.employeeId,
                        points: redemption.reward.pointCost,
                        reason: `Refund: ${redemption.reward.name} (rejected)`,
                    },
                }),
                prisma.reward.update({
                    where: { id: redemption.rewardId },
                    data: { stock: { increment: 1 } },
                }),
            ]);

            // Notify employee
            await notificationService.create(
                redemption.employeeId,
                `❌ Your redemption for "${redemption.reward.name}" was rejected. Points refunded.`,
                'REWARD_REJECTED'
            );

            return sendSuccess(res, updated, 'Redemption rejected, points refunded');
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },
};
