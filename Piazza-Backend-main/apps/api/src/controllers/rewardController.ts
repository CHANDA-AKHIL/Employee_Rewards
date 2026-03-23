import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { sendSuccess, sendPaginated, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/verifyJWT';
import { s3Service } from '../services/s3Service';

export const rewardController = {
    async list(req: Request, res: Response) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;
            const category = req.query.category as string;
            const skip = (page - 1) * limit;

            const where = category ? { category } : {};

            const [rewards, total] = await Promise.all([
                prisma.reward.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                }),
                prisma.reward.count({ where }),
            ]);

            // Generate signed URLs for images
            const rewardsWithUrls = await Promise.all(
                rewards.map(async (reward: any) => {
                    if (reward.imageUrl) {
                        try {
                            const signedUrl = await s3Service.getSignedUrl(reward.imageUrl);
                            return { ...reward, imageUrl: signedUrl };
                        } catch {
                            return reward;
                        }
                    }
                    return reward;
                })
            );

            return sendPaginated(res, rewardsWithUrls, { page, limit, total });
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },

    async create(req: AuthRequest, res: Response) {
        try {
            const { name, description, pointCost, category, stock } = req.body;

            if (!name || !pointCost) {
                return sendError(res, 'Name and pointCost are required', 400);
            }

            let imageUrl: string | undefined;
            if (req.file) {
                imageUrl = await s3Service.uploadFile(
                    req.file.buffer,
                    req.file.originalname,
                    req.file.mimetype,
                    'rewards'
                );
            }

            const reward = await prisma.reward.create({
                data: {
                    name,
                    description,
                    pointCost: parseInt(pointCost, 10),
                    category,
                    stock: parseInt(stock || '0', 10),
                    imageUrl,
                },
            });

            return sendSuccess(res, reward, 'Reward created', 201);
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },

    async getById(req: Request, res: Response) {
        try {
            const reward = await prisma.reward.findUnique({
                where: { id: req.params.id },
            });

            if (!reward) {
                return sendError(res, 'Reward not found', 404);
            }

            if (reward.imageUrl) {
                try {
                    reward.imageUrl = await s3Service.getSignedUrl(reward.imageUrl);
                } catch { }
            }

            return sendSuccess(res, reward);
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },

    async update(req: AuthRequest, res: Response) {
        try {
            const { name, description, pointCost, category, stock } = req.body;

            const reward = await prisma.reward.findUnique({ where: { id: req.params.id } });
            if (!reward) {
                return sendError(res, 'Reward not found', 404);
            }

            let imageUrl: string | undefined;
            if (req.file) {
                // Delete old image if exists
                if (reward.imageUrl) {
                    try {
                        await s3Service.deleteFile(reward.imageUrl);
                    } catch { }
                }
                imageUrl = await s3Service.uploadFile(
                    req.file.buffer,
                    req.file.originalname,
                    req.file.mimetype,
                    'rewards'
                );
            }

            const updated = await prisma.reward.update({
                where: { id: req.params.id },
                data: {
                    ...(name && { name }),
                    ...(description !== undefined && { description }),
                    ...(pointCost && { pointCost: parseInt(pointCost, 10) }),
                    ...(category !== undefined && { category }),
                    ...(stock !== undefined && { stock: parseInt(stock, 10) }),
                    ...(imageUrl && { imageUrl }),
                },
            });

            return sendSuccess(res, updated, 'Reward updated');
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },

    async remove(req: AuthRequest, res: Response) {
        try {
            const reward = await prisma.reward.findUnique({ where: { id: req.params.id } });
            if (!reward) {
                return sendError(res, 'Reward not found', 404);
            }

            // Delete image from storage
            if (reward.imageUrl) {
                try {
                    await s3Service.deleteFile(reward.imageUrl);
                } catch { }
            }

            await prisma.reward.delete({ where: { id: req.params.id } });
            return sendSuccess(res, null, 'Reward deleted');
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },
};
