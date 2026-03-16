import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../prisma/client';
import redis from '../utils/redis';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/verifyJWT';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_SESSION_TTL = parseInt(process.env.JWT_SESSION_TTL || '604800', 10);

export const authController = {
    async register(req: Request, res: Response) {
        try {
            const { name, email, password, role, department } = req.body;

            if (!name || !email || !password) {
                return sendError(res, 'Name, email, and password are required', 400);
            }

            const existing = await prisma.employee.findUnique({ where: { email } });
            if (existing) {
                return sendError(res, 'Email already registered', 409);
            }

            const assignedRole = role || (email.toLowerCase().endsWith('@admin.com') ? 'ADMIN' : 'EMPLOYEE');
            
            // "Super Admin" logic: If this is the first admin or a specific master email, approve automatically.
            // For now, let's assume 'adminsample123@admin.com' is the super admin if it matches.
            const isSuperAdminEmail = email.toLowerCase() === 'adminsample123@admin.com';

            const passwordHash = await bcrypt.hash(password, 12);
            const employee = await prisma.employee.create({
                data: {
                    name,
                    email,
                    passwordHash,
                    role: assignedRole,
                    department,
                    totalPoints: 0,
                    streakCount: 0,
                    level: 1,
                    // Admins need approval unless they are Super Admin. Employees are approved by default.
                    isAdminApproved: assignedRole === 'ADMIN' ? isSuperAdminEmail : true,
                    isSuperAdmin: isSuperAdminEmail
                },
            });

            return sendSuccess(
                res,
                {
                    id: employee.id,
                    name: employee.name,
                    email: employee.email,
                    role: employee.role,
                },
                'Employee registered successfully',
                201
            );
        } catch (error: any) {
            console.error('Registration Error', error);
            return sendError(res, error?.message || 'Registration failed due to a server error', 500);
        }
    },

    async login(req: Request, res: Response) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return sendError(res, 'Email and password are required', 400);
            }

            const employee = await prisma.employee.findUnique({ where: { email } });
            if (!employee || employee.isDeleted) {
                return sendError(res, 'Invalid credentials', 401);
            }

            const isMatch = await bcrypt.compare(password, employee.passwordHash);
            if (!isMatch) {
                return sendError(res, 'Invalid credentials', 401);
            }

            // Check for admin approval
            if (employee.role === 'ADMIN' && !employee.isAdminApproved) {
                return sendError(res, 'Your admin account is pending approval from the Super Admin.', 403);
            }

            const payload = { 
                id: employee.id, 
                email: employee.email, 
                role: employee.role,
                isSuperAdmin: employee.isSuperAdmin 
            };
            const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });

            // Store session in Redis with TTL
            await redis.set(`session_${employee.id}`, token, 'EX', JWT_SESSION_TTL);

            return sendSuccess(res, {
                token,
                employee: {
                    id: employee.id,
                    name: employee.name,
                    email: employee.email,
                    role: employee.role,
                    department: employee.department,
                    isSuperAdmin: employee.isSuperAdmin
                },
            }, 'Login successful');
        } catch (error: any) {
            console.error('Login Error', error);
            return sendError(res, error?.message || 'Login failed due to a server error', 500);
        }
    },

    async logout(req: AuthRequest, res: Response) {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token || !req.user) {
                return sendError(res, 'Not authenticated', 401);
            }

            // Blacklist the token
            await redis.set(`bl_${token}`, '1', 'EX', JWT_SESSION_TTL);
            // Remove session
            await redis.del(`session_${req.user.id}`);

            return sendSuccess(res, null, 'Logged out successfully');
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },

    async me(req: AuthRequest, res: Response) {
        try {
            if (!req.user) {
                return sendError(res, 'Not authenticated', 401);
            }

            const employee = await prisma.employee.findUnique({
                where: { id: req.user.id },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    department: true,
                    level: true,
                    totalPoints: true,
                    streakCount: true,
                    isSuperAdmin: true,
                    createdAt: true,
                },
            });

            if (!employee) {
                return sendError(res, 'Employee not found', 404);
            }

            return sendSuccess(res, employee);
        } catch (error: any) {
            return sendError(res, error.message, 500);
        }
    },
};
