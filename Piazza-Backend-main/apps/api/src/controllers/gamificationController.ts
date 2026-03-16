import { Response } from 'express';
import prisma from '../prisma/client';
import { sendSuccess, sendPaginated, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/verifyJWT';
import { gamificationService } from '../services/gamificationService';
import { s3Service } from '../services/s3Service';

export const gamificationController = {
    async listBadges(req: AuthRequest, res: Response) {
        try {
            const badges = await gamificationService.getAllBadges();

            const badgesWithUrls = await Promise.all(
                badges.map(async (badge) => {
                    if (badge.imageUrl) {
                        try {
                            const url = await s3Service.getSignedUrl(badge.imageUrl);
                            return { ...badge, imageUrl: url };
                        } catch {
                            return badge;
                        }
                    }
                    return badge;
                })
            );

            return sendSuccess(res, badgesWithUrls);
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },

    async myBadges(req: AuthRequest, res: Response) {
        try {
            const badges = await gamificationService.getEmployeeBadges(req.user!.id);
            return sendSuccess(res, badges);
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },

    async leaderboard(req: AuthRequest, res: Response) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;

            const { entries, total } = await gamificationService.getLeaderboard(page, limit);
            return sendPaginated(res, entries, { page, limit, total });
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },

    async myRank(req: AuthRequest, res: Response) {
        try {
            const rank = await gamificationService.getEmployeeRank(req.user!.id);
            return sendSuccess(res, rank);
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },

    async listChallenges(req: AuthRequest, res: Response) {
        try {
            const challenges = await gamificationService.getActiveChallenges();
            return sendSuccess(res, challenges);
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },

    async createChallenge(req: AuthRequest, res: Response) {
        try {
            const { title, description, targetPoints, startDate, endDate } = req.body;

            if (!title || !targetPoints || !startDate || !endDate) {
                return sendError(res, 'title, targetPoints, startDate, endDate are required', 400);
            }

            const challenge = await gamificationService.createChallenge({
                title,
                description,
                targetPoints: parseInt(targetPoints, 10),
                startDate: new Date(startDate),
                endDate: new Date(endDate),
            });

            return sendSuccess(res, challenge, 'Challenge created', 201);
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },

    async challengeProgress(req: AuthRequest, res: Response) {
        try {
            const progress = await gamificationService.getChallengeProgress(
                req.params.id,
                req.user!.id
            );

            if (!progress) {
                return sendError(res, 'Challenge not found', 404);
            }

            return sendSuccess(res, progress);
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },

    async createBadge(req: AuthRequest, res: Response) {
        try {
            const { name, description, unlockCondition } = req.body;

            if (!name || !unlockCondition) {
                return sendError(res, 'name and unlockCondition are required', 400);
            }

            let imageUrl: string | undefined;
            if (req.file) {
                imageUrl = await s3Service.uploadFile(
                    req.file.buffer,
                    req.file.originalname,
                    req.file.mimetype,
                    'badges'
                );
            }

            const badge = await prisma.badge.create({
                data: {
                    name,
                    description,
                    unlockCondition: typeof unlockCondition === 'string'
                        ? unlockCondition
                        : JSON.stringify(unlockCondition),
                    imageUrl,
                },
            });

            return sendSuccess(res, badge, 'Badge created', 201);
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },
    async joinChallenge(req: AuthRequest, res: Response) {
        try {
            const participation = await gamificationService.joinChallenge(
                req.params.id,
                req.user!.id
            );
            return sendSuccess(res, participation, 'Successfully joined challenge', 201);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    },
};
