import { Router } from 'express';
import { kpiController } from '../controllers/kpiController';
import { verifyJWT } from '../middleware/verifyJWT';
import { roleGuard } from '../middleware/roleGuard';
import { auditLog } from '../middleware/auditLog';

const router = Router();

router.use(verifyJWT);

router.get('/', kpiController.list);
router.post('/', roleGuard('ADMIN'), auditLog('CREATE', 'kpis'), kpiController.create);
router.get('/:id', kpiController.getById);
router.put('/:id', roleGuard('ADMIN'), auditLog('UPDATE', 'kpis'), kpiController.update);
router.delete('/:id', roleGuard('ADMIN'), auditLog('DELETE', 'kpis'), kpiController.remove);
router.post('/:id/submit', kpiController.submit);
router.post('/:id/approve', roleGuard('ADMIN'), kpiController.approve);
router.post('/:id/reject', roleGuard('ADMIN'), kpiController.reject);

export default router;
