import { Response } from 'express';
import prisma from '../prisma/client';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/verifyJWT';

export const analyticsController = {
    async kpiTrends(req: AuthRequest, res: Response) {
        try {
            const period = (req.query.period as string) || 'month'; // week | month
            const now = new Date();
            let startDate: Date;

            if (period === 'week') {
                startDate = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000); // last 12 weeks
            } else {
                startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1); // last 12 months
            }

            const pointsData = await prisma.pointsLedger.findMany({
                where: {
                    createdAt: { gte: startDate },
                    points: { gt: 0 },
                },
                select: {
                    points: true,
                    createdAt: true,
                },
                orderBy: { createdAt: 'asc' },
            });

            // Group by period
            const trends: Record<string, number> = {};
            for (const entry of pointsData) {
                const key =
                    period === 'week'
                        ? getWeekKey(entry.createdAt)
                        : `${entry.createdAt.getFullYear()}-${String(entry.createdAt.getMonth() + 1).padStart(2, '0')}`;

                trends[key] = (trends[key] || 0) + entry.points;
            }

            return sendSuccess(res, trends);
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },

    async topPerformers(req: AuthRequest, res: Response) {
        try {
            const top = await prisma.employee.findMany({
                where: { isDeleted: false },
                select: {
                    id: true,
                    name: true,
                    department: true,
                    totalPoints: true,
                    level: true,
                },
                orderBy: { totalPoints: 'desc' },
                take: 10,
            });

            return sendSuccess(res, top);
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },

    async redemptionStats(req: AuthRequest, res: Response) {
        try {
            const stats = await prisma.redemption.groupBy({
                by: ['rewardId'],
                _count: { id: true },
                orderBy: { _count: { id: 'desc' } },
            });

            // Enrich with reward names
            const rewardIds = stats.map((s) => s.rewardId);
            const rewards = await prisma.reward.findMany({
                where: { id: { in: rewardIds } },
                select: { id: true, name: true, category: true, pointCost: true },
            });

            const enriched = stats.map((s) => {
                const reward = rewards.find((r) => r.id === s.rewardId);
                return {
                    rewardId: s.rewardId,
                    rewardName: reward?.name || 'Unknown',
                    category: reward?.category,
                    pointCost: reward?.pointCost,
                    redemptionCount: s._count.id,
                };
            });

            return sendSuccess(res, enriched);
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },

    async departmentStats(req: AuthRequest, res: Response) {
        try {
            const departments = await prisma.employee.groupBy({
                by: ['department'],
                _sum: { totalPoints: true },
                _count: { id: true },
                where: { isDeleted: false, department: { not: null } },
                orderBy: { _sum: { totalPoints: 'desc' } },
            });

            const result = departments.map((d) => ({
                department: d.department,
                totalPoints: d._sum.totalPoints || 0,
                employeeCount: d._count.id,
            }));

            return sendSuccess(res, result);
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },
};

function getWeekKey(date: Date): string {
    const start = new Date(date.getFullYear(), 0, 1);
    const diff = date.getTime() - start.getTime();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    const weekNum = Math.ceil(diff / oneWeek);
    return `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}
