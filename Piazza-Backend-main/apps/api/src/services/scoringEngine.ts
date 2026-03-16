import prisma from '../prisma/client';
import logger from '../utils/logger';
import { Server as SocketServer } from 'socket.io';
import { notificationService } from './notificationService';

let io: SocketServer | null = null;

export function setScoringIO(socketIO: SocketServer) {
    io = socketIO;
}

export const scoringEngine = {
    /**
     * Called when an admin approves a KPI.
     * 1. Write points to ledger
     * 2. Update employee totals
     * 3. Update streak
     * 4. Evaluate badge unlocks
     * 5. Recalculate leaderboard
     * 6. Emit socket events
     */
    async processApproval(kpiId: string): Promise<void> {
        const kpi = await prisma.kpi.findUnique({
            where: { id: kpiId },
            include: { employee: true },
        });

        if (!kpi || kpi.status !== 'APPROVED') {
            throw new Error('KPI not found or not in APPROVED status');
        }

        const employeeId = kpi.assignedTo;
        const points = kpi.pointValue;

        // 1. Write to points ledger
        await prisma.pointsLedger.create({
            data: {
                employeeId,
                points,
                reason: `KPI Approved: ${kpi.title}`,
            },
        });

        // 2. Update employee total points
        const updatedEmployee = await prisma.employee.update({
            where: { id: employeeId },
            data: {
                totalPoints: { increment: points },
            },
        });

        // 3. Update streak
        await this.updateStreak(employeeId);

        // 4. Evaluate badge unlocks
        await this.evaluateBadges(employeeId, updatedEmployee.totalPoints);

        // 5. Recalculate leaderboard
        await this.recalculateLeaderboard();

        // 6. Emit socket event
        if (io) {
            io.emit('leaderboard:update', { message: 'Leaderboard updated' });
        }

        logger.info(`Scoring processed for KPI ${kpiId}, Employee ${employeeId} earned ${points} points`);
    },

    async updateStreak(employeeId: string): Promise<void> {
        // Check if the employee completed a KPI yesterday (streak continuation)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const yesterdayApproval = await prisma.kpi.findFirst({
            where: {
                assignedTo: employeeId,
                status: 'APPROVED',
                approvedAt: {
                    gte: yesterday,
                    lt: today,
                },
            },
        });

        if (yesterdayApproval) {
            // Continue streak
            await prisma.employee.update({
                where: { id: employeeId },
                data: { streakCount: { increment: 1 } },
            });
        } else {
            // Check if this is the first approval today (reset streak to 1)
            const todayEnd = new Date();
            todayEnd.setHours(23, 59, 59, 999);

            const todayApprovals = await prisma.kpi.count({
                where: {
                    assignedTo: employeeId,
                    status: 'APPROVED',
                    approvedAt: {
                        gte: today,
                        lte: todayEnd,
                    },
                },
            });

            await prisma.employee.update({
                where: { id: employeeId },
                data: { streakCount: todayApprovals === 1 ? 1 : undefined },
            });
        }
    },

    async evaluateBadges(employeeId: string, totalPoints: number): Promise<void> {
        const allBadges = await prisma.badge.findMany();
        const earnedBadgeIds = (
            await prisma.employeeBadge.findMany({
                where: { employeeId },
                select: { badgeId: true },
            })
        ).map((eb) => eb.badgeId);

        const kpiCount = await prisma.kpi.count({
            where: { assignedTo: employeeId, status: 'APPROVED' },
        });

        const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
        const streakCount = employee?.streakCount || 0;

        for (const badge of allBadges) {
            if (earnedBadgeIds.includes(badge.id)) continue;

            let unlocked = false;
            try {
                const condition = JSON.parse(badge.unlockCondition);
                // Supported conditions:
                // { "type": "points", "threshold": 100 }
                // { "type": "kpis_completed", "threshold": 5 }
                // { "type": "streak", "threshold": 7 }
                switch (condition.type) {
                    case 'points':
                        unlocked = totalPoints >= condition.threshold;
                        break;
                    case 'kpis_completed':
                        unlocked = kpiCount >= condition.threshold;
                        break;
                    case 'streak':
                        unlocked = streakCount >= condition.threshold;
                        break;
                }
            } catch {
                logger.warn(`Invalid badge condition for badge ${badge.id}`);
            }

            if (unlocked) {
                await prisma.employeeBadge.create({
                    data: { employeeId, badgeId: badge.id },
                });

                // Send notification
                await notificationService.create(
                    employeeId,
                    `🏅 You unlocked the badge: ${badge.name}!`,
                    'BADGE_UNLOCKED'
                );

                // Emit socket event
                if (io) {
                    io.to(employeeId).emit('badge:unlocked', {
                        badgeId: badge.id,
                        name: badge.name,
                    });
                }

                logger.info(`Badge "${badge.name}" unlocked for employee ${employeeId}`);
            }
        }
    },

    async recalculateLeaderboard(): Promise<void> {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Get monthly points per employee
        const monthlyPoints = await prisma.pointsLedger.groupBy({
            by: ['employeeId'],
            _sum: { points: true },
            where: {
                createdAt: { gte: startOfMonth },
            },
            orderBy: {
                _sum: { points: 'desc' },
            },
        });

        // Upsert leaderboard entries
        for (let i = 0; i < monthlyPoints.length; i++) {
            const entry = monthlyPoints[i];
            await prisma.leaderboard.upsert({
                where: { employeeId: entry.employeeId },
                update: {
                    monthlyPoints: entry._sum.points || 0,
                    rank: i + 1,
                },
                create: {
                    employeeId: entry.employeeId,
                    monthlyPoints: entry._sum.points || 0,
                    rank: i + 1,
                },
            });
        }

        logger.info('Leaderboard recalculated');
    },
};
