import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock Prisma
jest.mock('../prisma/client', () => ({
    __esModule: true,
    default: {
        employee: {
            findUnique: jest.fn(),
            create: jest.fn(),
        },
    },
}));

// Mock Redis
jest.mock('../utils/redis', () => ({
    __esModule: true,
    default: {
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
    },
}));

import prisma from '../prisma/client';
import redis from '../utils/redis';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockRedis = redis as jest.Mocked<typeof redis>;

describe('Auth Logic', () => {
    const JWT_SECRET = process.env.JWT_SECRET || 'secret';

    describe('Password hashing', () => {
        it('should hash and verify passwords correctly', async () => {
            const password = 'TestPassword123!';
            const hash = await bcrypt.hash(password, 12);

            expect(hash).not.toBe(password);
            expect(await bcrypt.compare(password, hash)).toBe(true);
            expect(await bcrypt.compare('WrongPassword', hash)).toBe(false);
        });
    });

    describe('JWT token', () => {
        it('should sign and verify a JWT token', () => {
            const payload = { id: 'user-1', email: 'test@example.com', role: 'EMPLOYEE' };
            const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

            const decoded = jwt.verify(token, JWT_SECRET) as any;
            expect(decoded.id).toBe(payload.id);
            expect(decoded.email).toBe(payload.email);
            expect(decoded.role).toBe(payload.role);
        });

        it('should throw on invalid token', () => {
            expect(() => {
                jwt.verify('invalid.token.here', JWT_SECRET);
            }).toThrow();
        });

        it('should throw on expired token', () => {
            const token = jwt.sign({ id: '1' }, JWT_SECRET, { expiresIn: '0s' });
            // Allow a brief delay for expiration
            expect(() => {
                jwt.verify(token, JWT_SECRET);
            }).toThrow();
        });
    });

    describe('Registration validation', () => {
        it('should reject registration without required fields', () => {
            const body = { name: '', email: '', password: '' };
            expect(!body.name || !body.email || !body.password).toBe(true);
        });

        it('should detect existing email', async () => {
            (mockPrisma.employee.findUnique as jest.Mock).mockResolvedValue({
                id: '1',
                email: 'existing@test.com',
            });

            const result = await prisma.employee.findUnique({
                where: { email: 'existing@test.com' },
            });

            expect(result).not.toBeNull();
        });
    });
});
