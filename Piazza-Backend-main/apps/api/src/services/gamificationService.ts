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
        const [entries, total] = await Promise.all([
            prisma.leaderboard.findMany({
                orderBy: { rank: 'asc' },
                skip,
                take: limit,
                include: {
                    employee: {
                        select: { id: true, name: true, department: true, level: true },
                    },
                },
            }),
            prisma.leaderboard.count(),
        ]);

        return { entries, total };
    },

    async getEmployeeRank(employeeId: string) {
        const entry = await prisma.leaderboard.findUnique({
            where: { employeeId },
        });

        return entry || { rank: 0, monthlyPoints: 0 };
    },

    async getActiveChallenges() {
        const now = new Date();
        return prisma.challenge.findMany({
            where: {
                isActive: true,
                startDate: { lte: now },
                endDate: { gte: now },
            },
            include: {
                // Include participations so the frontend can check if the
                // employee has already joined without an extra API call
                participations: {
                    select: { id: true, employeeId: true, status: true },
                },
            },
            orderBy: { endDate: 'asc' },
        });
    },

    async createChallenge(data: {
        title: string;
        description?: string;
        targetPoints: number;
        startDate: Date;
        endDate: Date;
    }) {
        return prisma.challenge.create({ data });
    },

    async getChallengeProgress(challengeId: string, employeeId: string) {
        const [challenge, participation] = await Promise.all([
            prisma.challenge.findUnique({ where: { id: challengeId } }),
            prisma.challengeParticipation.findUnique({
                where: {
                    employeeId_challengeId: { employeeId, challengeId },
                },
            }),
        ]);

        if (!challenge) return null;

        const pointsInPeriod = await prisma.pointsLedger.aggregate({
            _sum: { points: true },
            where: {
                employeeId,
                createdAt: {
                    gte: participation?.joinedAt || challenge.startDate,
                    lte: challenge.endDate,
                },
            },
        });

        const earned = pointsInPeriod._sum.points || 0;

        return {
            challenge,
            participation,
            joined: !!participation,
            earned,
            currentPoints: earned,
            target: challenge.targetPoints,
            targetPoints: challenge.targetPoints,
            percentComplete: Math.min(100, Math.round((earned / challenge.targetPoints) * 100)),
            progress: Math.min(100, Math.round((earned / challenge.targetPoints) * 100)),
            status: participation?.status || 'NOT_JOINED',
        };
    },

    async joinChallenge(challengeId: string, employeeId: string) {
        const challenge = await prisma.challenge.findUnique({
            where: { id: challengeId, isActive: true },
        });

        if (!challenge) throw new Error('Challenge not found or inactive');

        const now = new Date();
        if (now < challenge.startDate || now > challenge.endDate) {
            throw new Error('Challenge is not currently active');
        }

        // ── Already joined — return existing participation instead of throwing ──
        // The DB has a @@unique([employeeId, challengeId]) constraint so attempting
        // a second create would crash with a unique constraint violation.
        const existing = await prisma.challengeParticipation.findUnique({
            where: {
                employeeId_challengeId: { employeeId, challengeId },
            },
        });

        if (existing) {
            logger.info(`Employee ${employeeId} already joined challenge ${challengeId} — returning existing`);
            return existing;
        }

        return prisma.challengeParticipation.create({
            data: {
                employeeId,
                challengeId,
                status: 'ACTIVE',
            },
        });
    },

    async getMyParticipations(employeeId: string) {
        return prisma.challengeParticipation.findMany({
            where: { employeeId },
            include: { challenge: true },
        });
    },
};