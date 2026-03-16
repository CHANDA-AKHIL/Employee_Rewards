import { Router } from 'express';
import { analyticsController } from '../controllers/analyticsController';
import { verifyJWT } from '../middleware/verifyJWT';
import { roleGuard } from '../middleware/roleGuard';

const router = Router();

router.use(verifyJWT);
router.use(roleGuard('ADMIN'));

router.get('/kpi-trends', analyticsController.kpiTrends);
router.get('/top-performers', analyticsController.topPerformers);
router.get('/redemption-stats', analyticsController.redemptionStats);
router.get('/department-stats', analyticsController.departmentStats);

export default router;
