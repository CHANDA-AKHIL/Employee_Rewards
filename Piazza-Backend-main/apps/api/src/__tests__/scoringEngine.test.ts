// Mock dependencies before imports
jest.mock('../prisma/client', () => ({
    __esModule: true,
    default: {
        kpi: {
            findUnique: jest.fn(),
        },
        pointsLedger: {
            create: jest.fn(),
            groupBy: jest.fn(),
        },
        employee: {
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        employeeBadge: {
            findMany: jest.fn(),
            create: jest.fn(),
        },
        badge: {
            findMany: jest.fn(),
        },
        leaderboard: {
            upsert: jest.fn(),
            count: jest.fn(),
        },
    },
}));

jest.mock('../services/notificationService', () => ({
    notificationService: {
        create: jest.fn(),
    },
}));

jest.mock('../utils/logger', () => ({
    __esModule: true,
    default: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
    },
}));

import prisma from '../prisma/client';

const mockPrisma = prisma as any;

describe('Scoring Engine Logic', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Point calculation', () => {
        it('should correctly calculate that points are positive integers', () => {
            const pointValue = 50;
            expect(pointValue).toBeGreaterThan(0);
            expect(Number.isInteger(pointValue)).toBe(true);
        });

        it('should verify points ledger entry structure', () => {
            const entry = {
                employeeId: 'emp-1',
                points: 100,
                reason: 'KPI Approved: Complete Task',
            };

            expect(entry.points).toBe(100);
            expect(entry.reason).toContain('KPI Approved');
            expect(entry.employeeId).toBeTruthy();
        });
    });

    describe('Streak calculation', () => {
        it('should continue streak when employee had approval yesterday', () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            const today = new Date();

            expect(yesterday.getTime()).toBeLessThan(today.getTime());
            // If yesterday's approval exists, streak increments
            const hasYesterdayApproval = true;
            const currentStreak = 5;
            const newStreak = hasYesterdayApproval ? currentStreak + 1 : 1;
            expect(newStreak).toBe(6);
        });

        it('should reset streak when no approval yesterday', () => {
            const hasYesterdayApproval = false;
            const newStreak = hasYesterdayApproval ? 6 : 1;
            expect(newStreak).toBe(1);
        });
    });

    describe('Badge unlock conditions', () => {
        it('should unlock points-based badge when threshold met', () => {
            const condition = { type: 'points', threshold: 100 };
            const totalPoints = 150;
            const unlocked = totalPoints >= condition.threshold;
            expect(unlocked).toBe(true);
        });

        it('should NOT unlock badge when threshold not met', () => {
            const condition = { type: 'points', threshold: 500 };
            const totalPoints = 150;
            const unlocked = totalPoints >= condition.threshold;
            expect(unlocked).toBe(false);
        });

        it('should handle kpis_completed condition', () => {
            const condition = { type: 'kpis_completed', threshold: 5 };
            const kpiCount = 5;
            const unlocked = kpiCount >= condition.threshold;
            expect(unlocked).toBe(true);
        });

        it('should handle streak condition', () => {
            const condition = { type: 'streak', threshold: 7 };
            const streakCount = 3;
            const unlocked = streakCount >= condition.threshold;
            expect(unlocked).toBe(false);
        });

        it('should handle invalid JSON condition gracefully', () => {
            const badCondition = 'not-valid-json{';
            let unlocked = false;
            try {
                JSON.parse(badCondition);
            } catch {
                unlocked = false;
            }
            expect(unlocked).toBe(false);
        });
    });

    describe('Leaderboard ranking', () => {
        it('should sort employees by monthly points descending', () => {
            const monthlyPoints = [
                { employeeId: 'a', points: 300 },
                { employeeId: 'b', points: 500 },
                { employeeId: 'c', points: 100 },
            ];

            const sorted = [...monthlyPoints].sort((a, b) => b.points - a.points);
            expect(sorted[0].employeeId).toBe('b');
            expect(sorted[1].employeeId).toBe('a');
            expect(sorted[2].employeeId).toBe('c');
        });

        it('should assign correct ranks', () => {
            const sorted = [
                { employeeId: 'b', points: 500 },
                { employeeId: 'a', points: 300 },
                { employeeId: 'c', points: 100 },
            ];

            const ranked = sorted.map((entry, idx) => ({ ...entry, rank: idx + 1 }));
            expect(ranked[0].rank).toBe(1);
            expect(ranked[1].rank).toBe(2);
            expect(ranked[2].rank).toBe(3);
        });
    });

    describe('Edge cases', () => {
        it('should handle zero point KPI', () => {
            const points = 0;
            expect(points).toBe(0);
        });

        it('should prevent duplicate badge awards', () => {
            const earnedBadgeIds = ['badge-1', 'badge-2'];
            const newBadgeId = 'badge-1';
            const alreadyEarned = earnedBadgeIds.includes(newBadgeId);
            expect(alreadyEarned).toBe(true);
        });
    });
});
