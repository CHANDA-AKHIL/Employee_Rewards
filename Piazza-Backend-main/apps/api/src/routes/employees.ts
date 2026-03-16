import { Router } from 'express';
import { employeeController } from '../controllers/employeeController';
import { verifyJWT } from '../middleware/verifyJWT';
import { roleGuard } from '../middleware/roleGuard';
import { auditLog } from '../middleware/auditLog';

const router = Router();

router.use(verifyJWT);

router.get('/', roleGuard('ADMIN'), employeeController.list);
router.post('/', roleGuard('ADMIN'), auditLog('CREATE', 'employees'), employeeController.create);
router.get('/:id', employeeController.getById);
router.put('/:id', roleGuard('ADMIN'), auditLog('UPDATE', 'employees'), employeeController.update);
router.patch('/:id/block', roleGuard('ADMIN'), auditLog('UPDATE', 'employees'), employeeController.toggleBlock);
router.delete('/:id', roleGuard('ADMIN'), auditLog('DELETE', 'employees'), employeeController.softDelete);
router.get('/:id/stats', employeeController.getStats);

export default router;
