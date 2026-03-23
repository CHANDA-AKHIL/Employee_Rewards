import prisma from '../prisma/client';
import logger from '../utils/logger';

export const gamificationService = {
    async getEmployeeBadges(employeeId: string) {
        return prisma.employeeBadge.findMany({
            where: { employeeId },
            include: { badge: true },
            orderBy: { unlockedAt: 'desc' },
        });
    },

    async getAllBadges() {
        return prisma.badge.findMany({
            orderBy: { name: 'asc' },
        });
    },

    async getLeaderboard(page = 1, limit = 20) {
        const skip = (page - 1) * limit;

        const [allEmployees, leaderboardEntries, total] = await Promise.all([
            prisma.employee.findMany({
                where: { isDeleted: false, role: 'EMPLOYEE' },
                select: { id: true, name: true, department: true, level: true, totalPoints: true },
                orderBy: { totalPoints: 'desc' },
                skip,
                take: limit,
            }),
            prisma.leaderboard.findMany({
                select: { employeeId: true, monthlyPoints: true, rank: true },
            }),
            prisma.employee.count({ where: { isDeleted: false, role: 'EMPLOYEE' } }),
        ]);

        const lbMap = new Map<string, { monthlyPoints: number; rank: number }>();
        for (const entry of leaderboardEntries) {
            lbMap.set(entry.employeeId, { monthlyPoints: entry.monthlyPoints, rank: entry.rank });
        }

        const entries = allEmployees.map((emp: any, index: number) => {
            const lb = lbMap.get(emp.id);
            return {
                id: emp.id,
                employeeId: emp.id,
                rank: lb?.rank ?? (skip + index + 1),
                monthlyPoints: lb?.monthlyPoints ?? 0,
                employee: {
                    id: emp.id,
                    name: emp.name,
                    department: emp.department,
                    level: emp.level,
                },
            };
        });

        return { entries, total };
    },

    async getEmployeeRank(employeeId: string) {
        const entry = await prisma.leaderboard.findUnique({ where: { employeeId } });
        if (entry) return entry;

        const employee = await prisma.employee.findUnique({
            where: { id: employeeId },
            select: { totalPoints: true },
        });
        if (!employee) return { rank: 0, monthlyPoints: 0 };

        const rank = await prisma.employee.count({
            where: { isDeleted: false, totalPoints: { gt: employee.totalPoints } },
        });

        return { rank: rank + 1, monthlyPoints: employee.totalPoints };
    },

    async getActiveChallenges() {
        return prisma.challenge.findMany({
            include: {
                participations: {
                    select: { id: true, employeeId: true, status: true },
                },
            },
            orderBy: { endDate: 'asc' },
        });
    },

    // ── Create challenge with optional briefUrl ────────────────────────────────
    async createChallenge(data: {
        title: string;
        description?: string;
        targetPoints: number;
        startDate: Date;
        endDate: Date;
        briefUrl?: string; // S3 URL of uploaded brief PDF/doc
    }) {
        return prisma.challenge.create({ data });
    },

    async getChallengeProgress(challengeId: string, employeeId: string) {
        const [challenge, participation] = await Promise.all([
            prisma.challenge.findUnique({ where: { id: challengeId } }),
            prisma.challengeParticipation.findUnique({
                where: { employeeId_challengeId: { employeeId, challengeId } },
            }),
        ]);

        if (!challenge) return null;

        // If approved, progress is 100% — the work is done
        if (participation?.status === 'APPROVED') {
            return {
                challenge,
                participation,
                joined: true,
                earned: challenge.targetPoints,
                currentPoints: challenge.targetPoints,
                target: challenge.targetPoints,
                targetPoints: challenge.targetPoints,
                percentComplete: 100,
                progress: 100,
                status: 'APPROVED',
            };
        }

        const pointsInPeriod = await prisma.pointsLedger.aggregate({
            _sum: { points: true },
            where: {
                employeeId,
                points: { gt: 0 },
                createdAt: {
                    gte: participation?.joinedAt || challenge.startDate,
                    lte: challenge.endDate,
                },
            },
        });

        const earned = pointsInPeriod._sum.points || 0;
        const pct = Math.min(100, Math.round((earned / challenge.targetPoints) * 100));

        return {
            challenge,
            participation,
            joined: !!participation,
            earned,
            currentPoints: earned,
            target: challenge.targetPoints,
            targetPoints: challenge.targetPoints,
            percentComplete: pct,
            progress: pct,
            status: participation?.status || 'NOT_JOINED',
        };
    },

    async joinChallenge(challengeId: string, employeeId: string) {
        const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
        if (!challenge || !challenge.isActive) throw new Error('Challenge not found or inactive');

        const now = new Date();
        if (now > challenge.endDate) throw new Error('This challenge has already ended');

        const existing = await prisma.challengeParticipation.findUnique({
            where: { employeeId_challengeId: { employeeId, challengeId } },
        });
        if (existing) {
            logger.info(`Employee ${employeeId} already joined challenge ${challengeId}`);
            return existing;
        }

        return prisma.challengeParticipation.create({
            data: { employeeId, challengeId, status: 'ACTIVE' },
        });
    },

    // ── Employee submits challenge (text note only if no file field in schema) ─
    async submitChallenge(challengeId: string, employeeId: string, submissionUrl?: string) {
        const participation = await prisma.challengeParticipation.findUnique({
            where: { employeeId_challengeId: { employeeId, challengeId } },
        });

        if (!participation) throw new Error('You have not joined this challenge');
        if (participation.status === 'COMPLETED') throw new Error('Challenge already submitted');

        return prisma.challengeParticipation.update({
            where: { employeeId_challengeId: { employeeId, challengeId } },
            data: { status: 'COMPLETED', submissionUrl: submissionUrl || null },
        });
    },

    async getMyParticipations(employeeId: string) {
        return prisma.challengeParticipation.findMany({
            where: { employeeId },
            include: { challenge: true },
        });
    },

    // ── Admin: Get all COMPLETED submissions for review ───────────────────────
    async getChallengeSubmissions() {
        return prisma.challengeParticipation.findMany({
            where: { status: 'COMPLETED' },
            include: {
                employee: { select: { id: true, name: true, email: true, department: true } },
                challenge: true,
            },
            orderBy: { joinedAt: 'desc' },
        });
    },

    // ── Admin: Approve a challenge submission ─────────────────────────────────
    async approveChallengeParticipation(participationId: string) {
        const participation = await prisma.challengeParticipation.findUnique({
            where: { id: participationId },
            include: { employee: true, challenge: true },
        });

        if (!participation) throw new Error('Participation record not found');

        const updated = await prisma.challengeParticipation.update({
            where: { id: participationId },
            data: { status: 'APPROVED' },
        });

        const points = participation.challenge.targetPoints;
        const employeeId = participation.employeeId;

        // 1. Write to points ledger
        await prisma.pointsLedger.create({
            data: {
                employeeId,
                points,
                reason: `Challenge Completed: ${participation.challenge.title}`,
            },
        });

        // 2. Update employee total points
        const updatedEmployee = await prisma.employee.update({
            where: { id: employeeId },
            data: { totalPoints: { increment: points } },
        });

        // 3. Notify employee with points info
        await prisma.notification.create({
            data: {
                employeeId,
                message: `🏆 Your submission for "${participation.challenge.title}" has been approved! You earned ${points} points!`,
                type: 'CHALLENGE_COMPLETED',
            },
        });

        // 4. Evaluate badge unlocks
        const { scoringEngine } = require('./scoringEngine');
        await scoringEngine.evaluateBadges(employeeId, updatedEmployee.totalPoints);

        // 5. Recalculate leaderboard
        await scoringEngine.recalculateLeaderboard();

        return updated;
    },
};