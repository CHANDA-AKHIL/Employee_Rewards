import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketServer } from 'socket.io';

import logger from './utils/logger';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { setupSocketHandlers } from './socket/handler';
import { setScoringIO } from './services/scoringEngine';
import { setNotificationIO } from './services/notificationService';

// Route imports
import authRoutes from './routes/auth';
import employeeRoutes from './routes/employees';
import kpiRoutes from './routes/kpis';
import rewardRoutes from './routes/rewards';
import redemptionRoutes from './routes/redemptions';
import gamificationRoutes from './routes/gamification';
import analyticsRoutes from './routes/analytics';
import notificationRoutes from './routes/notifications';
import auditRoutes from './routes/audit';
import adminApprovalRoutes from './routes/adminApproval';

const app = express();
const server = http.createServer(app);

// ─── Socket.io Setup ─────────────────────────────────
const io = new SocketServer(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        methods: ['GET', 'POST'],
    },
});

// Inject Socket.io into services
setScoringIO(io);
setNotificationIO(io);
setupSocketHandlers(io);

// ─── Express Middleware ──────────────────────────────
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// ─── Health Check ────────────────────────────────────
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API Routes ──────────────────────────────────────
const apiRouter = express.Router();
apiRouter.use('/auth', authRoutes);
apiRouter.use('/employees', employeeRoutes);
apiRouter.use('/kpis', kpiRoutes);
apiRouter.use('/rewards', rewardRoutes);
apiRouter.use('/redemptions', redemptionRoutes);
apiRouter.use('/gamification', gamificationRoutes);
apiRouter.use('/analytics', analyticsRoutes);
apiRouter.use('/notifications', notificationRoutes);
apiRouter.use('/audit', auditRoutes);
apiRouter.use('/admin-approval', adminApprovalRoutes);

// Alternate mount points for gamification sub-resources
apiRouter.use('/badges', gamificationRoutes);
apiRouter.use('/leaderboard', gamificationRoutes);
apiRouter.use('/challenges', gamificationRoutes);

app.use('/api', apiRouter);

// ─── Error Handler ───────────────────────────────────
app.use(errorHandler);

// ─── Start Server ────────────────────────────────────
const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
    logger.info(`🚀 Server running on http://localhost:${PORT}`);
    logger.info(`📡 Socket.io listening on ws://localhost:${PORT}`);
});

export { app, server, io };
