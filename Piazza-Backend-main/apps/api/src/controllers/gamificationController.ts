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
                        } catch { return badge; }
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

            // Generate signed URLs for briefUrl if present
            const withUrls = await Promise.all(
                challenges.map(async (c: any) => {
                    if (c.briefUrl) {
                        try {
                            const url = await s3Service.getSignedUrl(c.briefUrl);
                            return { ...c, briefUrl: url };
                        } catch { return c; }
                    }
                    return c;
                })
            );

            return sendSuccess(res, withUrls);
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },

    // ── Create challenge with optional brief file upload ───────────────────────
    // multipart/form-data: title, description, targetPoints, startDate, endDate, brief (file)
    async createChallenge(req: AuthRequest, res: Response) {
        try {
            const { title, description, targetPoints, startDate, endDate } = req.body;

            if (!title || !targetPoints || !startDate || !endDate) {
                return sendError(res, 'title, targetPoints, startDate, endDate are required', 400);
            }

            // Upload brief file to S3 if provided
            let briefUrl: string | undefined;
            if (req.file) {
                briefUrl = await s3Service.uploadFile(
                    req.file.buffer,
                    req.file.originalname,
                    req.file.mimetype,
                    'challenge-briefs'
                );
            }

            const challenge = await gamificationService.createChallenge({
                title,
                description,
                targetPoints: parseInt(targetPoints, 10),
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                briefUrl,
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
            if (!progress) return sendError(res, 'Challenge not found', 404);
            return sendSuccess(res, progress);
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

    // ── Employee submits challenge work (optional file upload) ─────────────────
    // multipart/form-data: submissionNote (text), submissionFile (file)
    async submitChallenge(req: AuthRequest, res: Response) {
        try {
            const employeeId = req.user!.id;
            const challengeId = req.params.id;

            // Upload submission file to S3 if provided
            let submissionUrl: string | undefined;
            if (req.file) {
                submissionUrl = await s3Service.uploadFile(
                    req.file.buffer,
                    req.file.originalname,
                    req.file.mimetype,
                    'challenge-submissions'
                );
            }

            // Mark participation as COMPLETED
            const participation = await gamificationService.submitChallenge(challengeId, employeeId);

            // Store submission metadata in a notification for the admin to review
            // (Since ChallengeParticipation may not have a submissionUrl field yet,
            //  we store the URL in a notification + notify admin)
            if (submissionUrl) {
                // Notify all admins about the new submission with the file URL
                const admins = await prisma.employee.findMany({
                    where: { role: 'ADMIN', isDeleted: false },
                    select: { id: true },
                });

                const employee = await prisma.employee.findUnique({
                    where: { id: employeeId },
                    select: { name: true },
                });

                const challenge = await prisma.challenge.findUnique({
                    where: { id: challengeId },
                    select: { title: true },
                });

                for (const admin of admins) {
                    await prisma.notification.create({
                        data: {
                            employeeId: admin.id,
                            message: `📎 ${employee?.name} submitted work for challenge "${challenge?.title}". File: ${submissionUrl}`,
                            type: 'CHALLENGE_SUBMISSION',
                        },
                    });
                }
            }

            return sendSuccess(res, { ...participation, submissionUrl }, 'Challenge submitted! Great work! 🎉');
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    },

    // ── Admin: List all challenge submissions ─────────────────────────────────
    async listSubmissions(req: AuthRequest, res: Response) {
        try {
            const submissions = await gamificationService.getChallengeSubmissions();
            return sendSuccess(res, submissions);
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },

    // ── Admin: Approve a challenge submission ─────────────────────────────────
    async approveSubmission(req: AuthRequest, res: Response) {
        try {
            const updated = await gamificationService.approveChallengeParticipation(req.params.id);
            return sendSuccess(res, updated, 'Challenge submission verified');
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

            let conditionStr: string;
            try { JSON.parse(unlockCondition); conditionStr = unlockCondition; }
            catch { conditionStr = unlockCondition; }

            const badge = await prisma.badge.create({
                data: { name, description, unlockCondition: conditionStr, imageUrl },
            });

            return sendSuccess(res, badge, 'Badge created', 201);
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },
};