import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/verifyJWT';

export const adminApprovalController = {
    async listPendingAdmins(req: AuthRequest, res: Response) {
        try {
            if (!(req.user as any)?.isSuperAdmin) {
                return sendError(res, 'Unprivileged access: Super Admin only', 403);
            }

            const pendingAdmins = await prisma.employee.findMany({
                where: {
                    role: 'ADMIN',
                    isAdminApproved: false,
                    isDeleted: false
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    createdAt: true,
                    department: true
                }
            });

            return sendSuccess(res, pendingAdmins);
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },

    async approveAdmin(req: AuthRequest, res: Response) {
        try {
            if (!(req.user as any)?.isSuperAdmin) {
                return sendError(res, 'Unprivileged access: Super Admin only', 403);
            }

            const { id } = req.params;
            const { approve } = req.body; // boolean

            if (approve) {
                const admin = await prisma.employee.update({
                    where: { id },
                    data: { isAdminApproved: true }
                });

                // Logic to send email would go here
                console.log(`Email sent to ${admin.email}: Admin account approved.`);

                return sendSuccess(res, null, 'Admin account approved successfully');
            } else {
                // Reject: Mark as deleted or restricted
                await prisma.employee.update({
                    where: { id },
                    data: { isDeleted: true }
                });

                return sendSuccess(res, null, 'Admin account rejected and restricted');
            }
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    }
};
